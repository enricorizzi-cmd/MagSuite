const express = require('express');
const router = express.Router();
const { createUser, authenticate, enableMfa } = require('./users');
const { generateTokens } = require('./tokens');
const { authenticateToken } = require('./middleware');
const audit = require('../audit');

router.post('/register', async (req, res) => {
  const { email, password, role, warehouse_id, company_id, permissions } = req.body;
  try {
    const user = await createUser({
      email,
      password,
      role,
      permissions,
      warehouse_id,
      company_id,
    });
    audit.logAction(user.id, 'register');
    res.status(201).json({ id: user.id, email: user.email });
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
