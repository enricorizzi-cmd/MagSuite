const express = require('express');
const router = express.Router();
const { createUser, authenticate, enableMfa } = require('./users');
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

    const assignedRole = role || (company_mode === 'new' ? 'admin' : 'standard');
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

module.exports = router;
