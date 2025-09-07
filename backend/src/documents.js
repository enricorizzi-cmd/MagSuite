const express = require('express');
const db = require('../db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    lines JSONB DEFAULT '[]'
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id),
    type TEXT
  )`);
})();

router.get('/', async (req, res) => {
  const { type } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  let query = 'SELECT * FROM documents';
  const params = [];
  if (type) {
    params.push(type);
    query += ` WHERE type = $${params.length}`;
  }
  params.push(limit, offset);
  query += ` ORDER BY id LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const result = await db.query(query, params);
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { type, lines = [] } = req.body;
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Type required' });
  }
  const result = await db.query(
    'INSERT INTO documents(type, lines) VALUES($1, $2::jsonb) RETURNING *',
    [type, JSON.stringify(lines)]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM documents WHERE id=$1', [id]);
  const doc = result.rows[0];
  if (!doc) return res.status(404).end();
  res.json(doc);
});

router.post('/:id/confirm', async (req, res) => {
  const id = Number(req.params.id);
  const docRes = await db.query('SELECT * FROM documents WHERE id=$1', [id]);
  const doc = docRes.rows[0];
  if (!doc) return res.status(404).end();
  const frozen = await db.query(
    "SELECT COUNT(*) AS count FROM inventories WHERE status='frozen'"
  );
  if (Number(frozen.rows[0].count) > 0) {
    return res.status(409).json({ error: 'Area frozen' });
  }
  const moves = Array.isArray(req.body.movements) ? req.body.movements : [];
  for (const m of moves) {
    await db.query(
      'INSERT INTO stock_movements(document_id, type) VALUES($1,$2)',
      [id, m]
    );
  }
  await db.query('UPDATE documents SET status=$1 WHERE id=$2', [
    'confirmed',
    id,
  ]);
  res.json({ status: 'confirmed' });
});

module.exports = { router };
