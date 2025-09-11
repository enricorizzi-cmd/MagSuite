const express = require('express');
const router = express.Router();
const { createUser, authenticate, enableMfa, ready, getUserById, updateUser } = require('./users');
const { generateTokens } = require('./tokens');
const { authenticateToken } = require('./middleware');
const audit = require('../audit');
const db = require('../db');
const companies = require('../companies');
const approvals = require('./approvals');
const { notify } = require('../notifications');

router.post('/register', async (req, res) => {
  const {
    email,
    password,
    role,
    warehouse_id,
    company_id,
    permissions,
    name,
    company_name,
    company_mode, // 'existing' | 'new'
  } = req.body || {};
  try {
    await ready;
    let finalCompanyId = company_id || null;

    // Ensure companies table and case-insensitive unique index exist
    await db.query(
      `CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`
    );
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies (lower(name))`
    );

    const cname = (company_name || '').trim();
    if (!finalCompanyId && cname) {
      if (company_mode === 'existing' || !company_mode) {
        // Default: existing company required
        const sel = await db.query(`SELECT id, name FROM companies WHERE lower(name)=lower($1)`, [cname]);
        if (!sel.rows[0]) {
          return res.status(400).json({ error: 'Azienda non esistente' });
        }
        finalCompanyId = sel.rows[0].id;
      } else if (company_mode === 'new') {
        // Create new company, error if duplicate by case-insensitive name
        const ins = await db.query(
          `INSERT INTO companies(name) VALUES($1) ON CONFLICT (lower(name)) DO NOTHING RETURNING id`,
          [cname]
        );
        if (ins.rows[0]) {
          finalCompanyId = ins.rows[0].id;
        } else {
          const sel = await db.query(`SELECT id FROM companies WHERE lower(name)=lower($1)`, [cname]);
          if (sel.rows[0]) {
            return res.status(400).json({ error: 'Nome azienda già utilizzato' });
          }
        }
      }
    }

    // Role assignment: first-ever user becomes super_admin; else admin for new company, standard for existing
    const { rows: cntRows } = await db.query('SELECT COUNT(*)::int AS c FROM users');
    const isFirstUser = (cntRows[0]?.c || 0) === 0;
    const assignedRole = isFirstUser ? 'super_admin' : (role || (company_mode === 'new' ? 'admin' : 'standard'));
    const userStatus = (process.env.NODE_ENV === 'test' || isFirstUser) ? 'active' : 'pending';
    const user = await createUser({
      email,
      password,
      role: assignedRole,
      permissions,
      warehouse_id,
      company_id: finalCompanyId,
      name,
      status: userStatus,
    });
    audit.logAction(user.id, 'register', { company_id: finalCompanyId, company_mode: company_mode || 'existing' });
    // Open approval item and notify company admins and super admins viewing this company
    try {
      if (userStatus === 'pending') {
        await approvals.openForUser(user.id, finalCompanyId || null);
        const payload = {
          type: 'user_approval_pending',
          title: 'Nuovo utente in attivazione',
          body: `Conferma e scegli ruolo per ${user.email}`,
          time: new Date().toISOString(),
          user_id: user.id,
          url: '/users'
        };
        if (finalCompanyId) notify(finalCompanyId, payload);
      }
    } catch {}
    res.status(201).json({ id: user.id, email: user.email, company_id: finalCompanyId, role: user.role });
  } catch (err) {
    // Log error to aid debugging in tests
    console.error('Register error:', err && err.message ? err.message : err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, mfaToken, remember } = req.body || {};
  const user = await authenticate({ email, password, mfaToken });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Block login for pending or suspended users
  if (user.status && user.status !== 'active') {
    if (user.status === 'pending') return res.status(403).json({ error: 'Utente in attivazione' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Utente sospeso' });
  }
  try {
    const { rows } = await db.query('SELECT suspended FROM companies WHERE id=$1', [user.company_id]);
    if (rows[0] && rows[0].suspended) {
      return res.status(403).json({ error: 'Azienda sospesa' });
    }
  } catch {}
  audit.logAction(user.id, 'login');
  try {
    await db.query('UPDATE users SET last_login=now() WHERE id=$1', [user.id]);
    user.last_login = new Date().toISOString();
  } catch {}
  const tokens = generateTokens(user, { remember: !!remember });
  res.json(tokens);
});

router.post('/mfa/setup', authenticateToken, async (req, res) => {
  const secret = await enableMfa(req.user.id);
  audit.logAction(req.user.id, 'enable_mfa');
  res.json({ secret });
});

// Company existence check (case-insensitive)
router.get('/company-exists', async (req, res) => {
  const name = (req.query.name || '').toString().trim();
  if (!name) return res.json({ exists: false });
  await db.query(
    `CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`
  );
  const sel = await db.query(`SELECT id, name FROM companies WHERE lower(name)=lower($1)`, [name]);
  if (sel.rows[0]) return res.json({ exists: true, id: sel.rows[0].id, name: sel.rows[0].name });
  res.json({ exists: false });
});

// Current company details for the active context
router.get('/current-company', authenticateToken, async (req, res) => {
  // Bind company explicitly from the authenticated user
  const { rows } = await db.query(
    `SELECT id, name FROM companies WHERE id = $1`,
    [req.user.company_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Company not found' });
  res.json(rows[0]);
});

// List companies (super admin only)
router.get('/companies', authenticateToken, async (req, res) => {
  const user = req.user;
  if (user.role !== 'super_admin') return res.sendStatus(403);
  await companies.ready;
  const { rows } = await db.query(`SELECT id, name, suspended FROM companies ORDER BY name`);
  res.json(rows);
});

// Suspend/unsuspend a company (super admin only)
router.post('/companies/:id/suspend', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  const { suspended } = req.body || {};
  if (typeof suspended !== 'boolean') return res.status(400).json({ error: 'suspended boolean required' });
  try {
    const result = await companies.setSuspended(id, suspended, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a company and all its data (super admin only)
router.delete('/companies/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  try {
    await companies.deleteCompanyAndData(id, req.user.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Current user info
router.get('/me', authenticateToken, (req, res) => {
  const { id, role, warehouse_id, company_id, permissions } = req.user || {};
  res.json({ id, role, warehouse_id, company_id, permissions });
});

// List users for a specific company (super admin only)
router.get('/company-users/:id', authenticateToken, (req, res) => {
  (async () => {
    const user = req.user;
    if (user.role !== 'super_admin') return res.sendStatus(403);
    const cid = Number(req.params.id);
    const { rows } = await db.query(
      `SELECT u.id, u.email, COALESCE(r.name,'worker') AS role, u.warehouse_id, u.company_id, u.last_login, u.name, u.status
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.company_id = $1 ORDER BY u.id`, [cid]
    );
    res.json(rows.map(u => ({ id: u.id, email: u.email, role: u.role, warehouse_id: u.warehouse_id, company_id: u.company_id, last_login: u.last_login, name: u.name, status: u.status })));
  })().catch(err => res.status(500).json({ error: err.message }));
});

// List users for the current company (visible to all roles)
router.get('/my-company/users', authenticateToken, (req, res) => {
  (async () => {
    const headerCompany = req.headers['x-company-id'];
    const companyId = Number(headerCompany || req.user.company_id);
    const { rows } = await db.query(
      `SELECT u.id, u.email, COALESCE(r.name,'worker') AS role, u.warehouse_id, u.company_id, u.last_login, u.name, u.status
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.company_id = $1 ORDER BY u.id`, [companyId]
    );
    res.json(rows.map(u => ({ id: u.id, email: u.email, role: u.role, warehouse_id: u.warehouse_id, company_id: u.company_id, last_login: u.last_login, name: u.name, status: u.status })));
  })().catch(err => res.status(500).json({ error: err.message }));
});

// Get user by id (super admin only)
router.get('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  try {
    const user = await getUserById(id);
    if (!user) return res.sendStatus(404);
    const out = { id: user.id, email: user.email, role: user.role, warehouse_id: user.warehouse_id, company_id: user.company_id, last_login: user.last_login, name: user.name, status: user.status };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user (super admin only)
router.put('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  const { email, password, role, warehouse_id, company_id, name, status } = req.body || {};
  try {
    const updated = await updateUser(id, { email, password, role, warehouse_id, company_id, name, status });
    const out = { id: updated.id, email: updated.email, role: updated.role, warehouse_id: updated.warehouse_id, company_id: updated.company_id, last_login: updated.last_login, name: updated.name, status: updated.status };
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Approve and activate a pending user (admin of same company or super_admin)
router.post('/users/:id/approve', authenticateToken, async (req, res) => {
  const actor = req.user;
  if (!['admin', 'super_admin'].includes(actor.role)) return res.sendStatus(403);
  const id = Number(req.params.id);
  const { role } = req.body || {};
  try {
    const target = await getUserById(id);
    if (!target) return res.sendStatus(404);
    if (actor.role !== 'super_admin' && actor.company_id !== target.company_id) return res.sendStatus(403);
    if (target.status !== 'pending') return res.status(400).json({ error: 'Utente non in attivazione' });
    const updated = await updateUser(id, { role: typeof role === 'string' ? role : target.role, status: 'active' });
    await approvals.resolveForUser(id, actor.id);
    audit.logAction(actor.id, 'approve_user', { user_id: id, company_id: updated.company_id, role: updated.role });
    // Notify resolution to remove pending notifications in clients
    if (updated.company_id) notify(updated.company_id, { type: 'user_approval_resolved', user_id: id, time: new Date().toISOString() });
    res.json({ ok: true, id, status: updated.status, role: updated.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a user (super admin only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  try {
    const { rows } = await db.query('DELETE FROM users WHERE id=$1 RETURNING id', [id]);
    if (!rows[0]) return res.sendStatus(404);
    audit.logAction(req.user.id, 'delete_user', { user_id: id });
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Maintenance: promote the only existing user to super_admin (protected)
router.post('/promote-if-single', async (req, res) => {
  const allow = process.env.API_KEY ? req.headers['x-api-key'] === process.env.API_KEY : process.env.NODE_ENV !== 'production';
  if (!allow) return res.sendStatus(403);
  const { rows } = await db.query('SELECT COUNT(*)::int AS c FROM users');
  if ((rows[0]?.c || 0) === 1) {
    const { rows: only } = await db.query('SELECT id FROM users LIMIT 1');
    const uid = only[0].id;
    // ensure role exists
    await db.query(`INSERT INTO roles(name) VALUES('super_admin') ON CONFLICT(name) DO NOTHING`);
    await db.query(`UPDATE users SET role_id=(SELECT id FROM roles WHERE name='super_admin') WHERE id=$1`, [uid]);
    audit.logAction(uid, 'promote_super_admin');
    return res.json({ ok: true, id: uid, role: 'super_admin' });
  }
  res.json({ ok: false, reason: 'not-single' });
});

module.exports = router;
