const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS causals (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT,
    sign INTEGER NOT NULL DEFAULT 1,
    company_id INTEGER REFERENCES companies(id)
  )`);
})();

router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM causals ORDER BY id');
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { code, description = '', sign = 1 } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code required' });
  }
  const result = await db.query(
    'INSERT INTO causals(code, description, sign) VALUES($1,$2,$3) RETURNING *',
    [code, description, sign]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM causals WHERE id=$1', [id]);
  const caus = result.rows[0];
  if (!caus) return res.status(404).end();
  res.json(caus);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { code, description, sign } = req.body;
  const fields = [];
  const params = [];
  if (code !== undefined) {
    params.push(code);
    fields.push(`code=$${params.length}`);
  }
  if (description !== undefined) {
    params.push(description);
    fields.push(`description=$${params.length}`);
  }
  if (sign !== undefined) {
    params.push(sign);
    fields.push(`sign=$${params.length}`);
  }
  if (!fields.length) {
    return res.status(400).json({ error: 'No fields provided' });
  }
  params.push(id);
  const result = await db.query(
    `UPDATE causals SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING *`,
    params
  );
  if (!result.rows[0]) return res.status(404).end();
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.query('DELETE FROM causals WHERE id=$1', [id]);
  res.status(204).end();
});

module.exports = { router };
