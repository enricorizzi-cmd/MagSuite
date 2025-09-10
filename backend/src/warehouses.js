const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL DEFAULT current_setting('app.current_company_id')::int,
    UNIQUE(company_id, name)
  )`);
})();

router.get('/', async (req, res) => {
  const result = await db.query(
    "SELECT id, name FROM warehouses WHERE company_id = current_setting('app.current_company_id')::int ORDER BY id"
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO warehouses(name) VALUES($1) RETURNING id, name',
    [name]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "SELECT id, name FROM warehouses WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int",
    [id]
  );
  const wh = result.rows[0];
  if (!wh) return res.status(404).end();
  res.json(wh);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    "UPDATE warehouses SET name=$1 WHERE id=$2 AND company_id = current_setting('app.current_company_id')::int RETURNING id, name",
    [name, id]
  );
  const wh = result.rows[0];
  if (!wh) return res.status(404).end();
  res.json(wh);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "DELETE FROM warehouses WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int",
    [id]
  );
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };
