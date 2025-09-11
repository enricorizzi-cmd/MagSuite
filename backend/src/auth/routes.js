const express = require('express');
const router = express.Router();
const { createUser, authenticate, enableMfa, ready, getUserById, updateUser } = require('./users');
const { generateTokens } = require('./tokens');
const { authenticateToken } = require('./middleware');
const audit = require('../audit');
const db = require('../db');

router.post('/register', async (req, res) => {
  const {
    email,
    password,
    role,
    warehouse_id,
    company_id,
    permissions,
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
    const user = await createUser({
      email,
      password,
      role: assignedRole,
      permissions,
      warehouse_id,
      company_id: finalCompanyId,
    });
    audit.logAction(user.id, 'register', { company_id: finalCompanyId, company_mode: company_mode || 'existing' });
    res.status(201).json({ id: user.id, email: user.email, company_id: finalCompanyId, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, mfaToken, remember } = req.body || {};
  const user = await authenticate({ email, password, mfaToken });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  audit.logAction(user.id, 'login');
  try {
    await db.query('UPDATE users SET last_login=now() WHERE id=$1', [user.id]);
    user.last_login = new Date().toISOString();
  } catch {}
  const tokens = generateTokens(user, { remember: !!remember });
  res.json(tokens);
});

router.post('/mfa/setup', authenticateToken, (req, res) => {
  const secret = enableMfa(req.user.id);
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
  const { rows } = await db.query(`SELECT id, name FROM companies WHERE id = current_setting('app.current_company_id')::int`);
  if (!rows[0]) return res.status(404).json({ error: 'Company not found' });
  res.json(rows[0]);
});

// List companies (super admin only)
router.get('/companies', authenticateToken, async (req, res) => {
  const user = req.user;
  if (user.role !== 'super_admin') return res.sendStatus(403);
  const { rows } = await db.query(`SELECT id, name FROM companies ORDER BY name`);
  res.json(rows);
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
      `SELECT u.id, u.email, COALESCE(r.name,'worker') AS role, u.warehouse_id, u.company_id, u.last_login, u.name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.company_id = $1 ORDER BY u.id`, [cid]
    );
    res.json(rows.map(u => ({ id: u.id, email: u.email, role: u.role, warehouse_id: u.warehouse_id, company_id: u.company_id, last_login: u.last_login, name: u.name })));
  })().catch(err => res.status(500).json({ error: err.message }));
});

// List users for the current company (visible to all roles)
router.get('/my-company/users', authenticateToken, (req, res) => {
  (async () => {
    const headerCompany = req.headers['x-company-id'];
    const companyId = Number(headerCompany || req.user.company_id);
    const { rows } = await db.query(
      `SELECT u.id, u.email, COALESCE(r.name,'worker') AS role, u.warehouse_id, u.company_id, u.last_login, u.name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.company_id = $1 ORDER BY u.id`, [companyId]
    );
    res.json(rows.map(u => ({ id: u.id, email: u.email, role: u.role, warehouse_id: u.warehouse_id, company_id: u.company_id, last_login: u.last_login, name: u.name })));
  })().catch(err => res.status(500).json({ error: err.message }));
});

// Get user by id (super admin only)
router.get('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  try {
    const user = await getUserById(id);
    if (!user) return res.sendStatus(404);
    const out = { id: user.id, email: user.email, role: user.role, warehouse_id: user.warehouse_id, company_id: user.company_id, last_login: user.last_login, name: user.name };
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user (super admin only)
router.put('/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  const id = Number(req.params.id);
  const { email, password, role, warehouse_id, company_id, name } = req.body || {};
  try {
    const updated = await updateUser(id, { email, password, role, warehouse_id, company_id, name });
    const out = { id: updated.id, email: updated.email, role: updated.role, warehouse_id: updated.warehouse_id, company_id: updated.company_id, last_login: updated.last_login, name: updated.name };
    res.json(out);
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
