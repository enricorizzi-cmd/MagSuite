const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    lotti BOOLEAN DEFAULT false,
    seriali BOOLEAN DEFAULT false
  )`);
})();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.query(
    'SELECT id, name, lotti, seriali FROM items ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { name, lotti = false, seriali = false } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO items(name, lotti, seriali) VALUES($1,$2,$3) RETURNING id, name, lotti, seriali',
    [name, lotti, seriali]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = { router };
