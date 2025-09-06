const express = require('express');
const router = express.Router();
const { createUser, authenticate } = require('./users');
const { generateTokens } = require('./tokens');

router.post('/register', async (req, res) => {
  const { email, password, role, warehouse_id } = req.body;
  try {
    const user = await createUser({ email, password, role, warehouse_id });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticate({ email, password });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const tokens = generateTokens(user);
  res.json(tokens);
});

module.exports = router;
