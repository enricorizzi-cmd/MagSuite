const express = require('express');
const router = express.Router();
const { createUser, authenticate, enableMfa } = require('./users');
const { generateTokens } = require('./tokens');
const { authenticateToken } = require('./middleware');
const audit = require('../audit');
const db = require('../db');

router.post('/register', async (req, res) => {
  const { email, password, role, warehouse_id, company_id, permissions, company_name } = req.body || {};
  try {
    let finalCompanyId = company_id;
    // If no company_id provided, create or fetch by company_name
    if (!finalCompanyId && company_name) {
      await db.query(`CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
      const ins = await db.query(`INSERT INTO companies(name) VALUES($1) ON CONFLICT (name) DO NOTHING RETURNING id`, [company_name]);
      if (ins.rows[0]) {
        finalCompanyId = ins.rows[0].id;
      } else {
        const sel = await db.query(`SELECT id FROM companies WHERE name=$1`, [company_name]);
        finalCompanyId = sel.rows[0] && sel.rows[0].id;
      }
    }
    const user = await createUser({
      email,
      password,
      role: role || 'admin',
      permissions,
      warehouse_id,
      company_id: finalCompanyId,
    });
    audit.logAction(user.id, 'register', { company_id: finalCompanyId });
    res.status(201).json({ id: user.id, email: user.email, company_id: finalCompanyId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, mfaToken } = req.body;
  const user = await authenticate({ email, password, mfaToken });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  audit.logAction(user.id, 'login');
  const tokens = generateTokens(user);
  res.json(tokens);
});

router.post('/mfa/setup', authenticateToken, (req, res) => {
  const secret = enableMfa(req.user.id);
  audit.logAction(req.user.id, 'enable_mfa');
  res.json({ secret });
});

module.exports = router;
