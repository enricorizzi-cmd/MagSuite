const express = require('express');
const db = require('../db');
const { authenticateToken, rbac } = require('./auth');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS inventories (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    scope JSONB,
    counts JSONB DEFAULT '[]',
    differences JSONB DEFAULT '[]',
    delta JSONB DEFAULT '[]'
  )`);
})();

router.get('/inventories', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.query(
    'SELECT * FROM inventories ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ items: result.rows });
});

router.post('/inventories', async (req, res) => {
  const scope = req.body.scope ? JSON.stringify(req.body.scope) : null;
  const result = await db.query(
    'INSERT INTO inventories(status, scope) VALUES($1, $2::jsonb) RETURNING *',
    ['open', scope]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/inventories/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM inventories WHERE id=$1', [id]);
  const inv = result.rows[0];
  if (!inv) return res.status(404).end();
  res.json(inv);
});

router.post('/inventories/:id/freeze', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'UPDATE inventories SET status=$1 WHERE id=$2 RETURNING status',
    ['frozen', id]
  );
  const inv = result.rows[0];
  if (!inv) return res.status(404).end();
  res.json({ status: inv.status });
});

router.post('/inventories/:id/close', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'UPDATE inventories SET status=$1 WHERE id=$2 RETURNING status, delta',
    ['closed', id]
  );
  const inv = result.rows[0];
  if (!inv) return res.status(404).end();
  const report = Buffer.from('inventory report').toString('base64');
  res.json({ status: inv.status, delta: inv.delta || [], report });
});

router.get(
  '/warehouse/:warehouse_id/inventory',
  authenticateToken,
  rbac('inventory', 'read'),
  (req, res) => {
    res.json({ items: [] });
  }
);

router.post(
  '/warehouse/:warehouse_id/inventory',
  authenticateToken,
  rbac('inventory', 'write'),
  (req, res) => {
    res.status(201).json({ status: 'created' });
  }
);

module.exports = { router };
