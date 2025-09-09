const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    lotti BOOLEAN DEFAULT false,
    seriali BOOLEAN DEFAULT false
  )`);
})();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.query(
    'SELECT id, name, sku, lotti, seriali FROM items ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { name, sku, lotti = false, seriali = false } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  if (!sku || typeof sku !== 'string') {
    return res.status(400).json({ error: 'SKU required' });
  }
  if (typeof lotti !== 'boolean' || typeof seriali !== 'boolean') {
    return res.status(400).json({ error: 'Invalid flags' });
  }
  const result = await db.query(
    'INSERT INTO items(name, sku, lotti, seriali) VALUES($1,$2,$3,$4) RETURNING id, name, sku, lotti, seriali',
    [name, sku, lotti, seriali]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await db.query('SELECT id, name, sku, lotti, seriali FROM items WHERE id=$1', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { name, sku, lotti, seriali } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) {
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid name' });
    }
    fields.push('name');
    values.push(name);
  }
  if (sku !== undefined) {
    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ error: 'Invalid sku' });
    }
    fields.push('sku');
    values.push(sku);
  }
  if (lotti !== undefined) {
    if (typeof lotti !== 'boolean') {
      return res.status(400).json({ error: 'Invalid lotti' });
    }
    fields.push('lotti');
    values.push(lotti);
  }
  if (seriali !== undefined) {
    if (typeof seriali !== 'boolean') {
      return res.status(400).json({ error: 'Invalid seriali' });
    }
    fields.push('seriali');
    values.push(seriali);
  }
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const setClause = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  values.push(id);
  const result = await db.query(
    `UPDATE items SET ${setClause} WHERE id=$${fields.length + 1} RETURNING id, name, sku, lotti, seriali`,
    values
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await db.query('DELETE FROM items WHERE id=$1', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).send();
});

module.exports = { router };
