const express = require('express');
const db = require('./db');

const router = express.Router();

const ready = (async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS sequences (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    prefix TEXT DEFAULT '',
    next_number INTEGER NOT NULL DEFAULT 1,
    company_id INTEGER DEFAULT current_setting('app.current_company_id')::int REFERENCES companies(id)
  )`);
})();

router.get('/', async (req, res) => {
  const result = await db.query(
    "SELECT * FROM sequences WHERE company_id = current_setting('app.current_company_id')::int ORDER BY id"
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { name, prefix = '', next_number = 1 } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO sequences(name, prefix, next_number) VALUES($1,$2,$3) RETURNING *',
    [name, prefix, next_number]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "SELECT * FROM sequences WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int",
    [id]
  );
  const seq = result.rows[0];
  if (!seq) return res.status(404).end();
  res.json(seq);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, prefix, next_number } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) {
    params.push(name);
    fields.push(`name=$${params.length}`);
  }
  if (prefix !== undefined) {
    params.push(prefix);
    fields.push(`prefix=$${params.length}`);
  }
  if (next_number !== undefined) {
    params.push(next_number);
    fields.push(`next_number=$${params.length}`);
  }
  if (!fields.length) {
    return res.status(400).json({ error: 'No fields provided' });
  }
  params.push(id);
  const result = await db.query(
    `UPDATE sequences SET ${fields.join(', ')} WHERE id=$${params.length} AND company_id = current_setting('app.current_company_id')::int RETURNING *`,
    params,
  );
  if (!result.rows[0]) return res.status(404).end();
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.query(
    "DELETE FROM sequences WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int",
    [id]
  );
  res.status(204).end();
});

router.get('/:id/preview', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    `SELECT prefix, next_number FROM sequences WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  const seq = result.rows[0];
  if (!seq) return res.status(404).end();
  res.json({ preview: `${seq.prefix}${seq.next_number}` });
});

module.exports = { router, ready };
