const express = require('express');
const db = require('./db');

const router = express.Router();

let initialized = false;
async function ensureReady() {
  if (initialized) return;
  await db.query(`CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'EUR',
    company_id INTEGER NOT NULL DEFAULT current_setting('app.current_company_id')::int,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS item_prices (
    price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    price NUMERIC NOT NULL,
    PRIMARY KEY(price_list_id, item_id),
    company_id INTEGER NOT NULL DEFAULT current_setting('app.current_company_id')::int
  )`);
  initialized = true;
}

router.get('/', async (req, res) => {
  await ensureReady();
  const { rows } = await db.query(
    `SELECT id, name, currency FROM price_lists WHERE company_id = current_setting('app.current_company_id')::int ORDER BY id`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  await ensureReady();
  const { name, currency = 'EUR' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await db.query(
    `INSERT INTO price_lists(name, currency) VALUES($1,$2) RETURNING id, name, currency`,
    [name, currency]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  await ensureReady();
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT id, name, currency FROM price_lists WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  await ensureReady();
  const id = Number(req.params.id);
  const { name, currency } = req.body || {};
  const fields = [];
  const params = [];
  if (name !== undefined) { params.push(name); fields.push(`name=$${params.length}`); }
  if (currency !== undefined) { params.push(currency); fields.push(`currency=$${params.length}`); }
  if (!fields.length) return res.status(400).json({ error: 'No fields' });
  params.push(id);
  const { rows } = await db.query(
    `UPDATE price_lists SET ${fields.join(', ')} WHERE id=$${params.length} AND company_id = current_setting('app.current_company_id')::int RETURNING id, name, currency`,
    params
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await ensureReady();
  const id = Number(req.params.id);
  await db.query(
    `DELETE FROM price_lists WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  res.status(204).end();
});

// Manage item prices for a list
router.get('/:id/items', async (req, res) => {
  await ensureReady();
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT i.id as item_id, i.name, i.sku, p.price,
            i.avg_weighted_price,
            CASE WHEN p.price IS NULL OR i.avg_weighted_price IS NULL THEN NULL
                 ELSE p.price - i.avg_weighted_price END AS margin
     FROM items i
     LEFT JOIN item_prices p
       ON p.item_id = i.id AND p.price_list_id=$1
     WHERE i.company_id = current_setting('app.current_company_id')::int
     ORDER BY i.id`,
    [id]
  );
  res.json(rows);
});

router.put('/:id/items/:itemId', async (req, res) => {
  await ensureReady();
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { price } = req.body || {};
  if (price === undefined || isNaN(Number(price))) return res.status(400).json({ error: 'Invalid price' });
  await db.query(
    `INSERT INTO item_prices(price_list_id, item_id, price)
     VALUES($1,$2,$3)
     ON CONFLICT (price_list_id, item_id) DO UPDATE SET price=EXCLUDED.price`,
    [id, itemId, price]
  );
  res.json({ status: 'ok' });
});

// Quick price endpoint per item
router.get('/item/:itemId/price', async (req, res) => {
  await ensureReady();
  const itemId = Number(req.params.itemId);
  const listId = Number(req.query.list_id);
  if (!listId) return res.status(400).json({ error: 'list_id required' });
  const { rows } = await db.query(
    `SELECT p.price, i.avg_weighted_price, 
            CASE WHEN p.price IS NULL OR i.avg_weighted_price IS NULL THEN NULL
                 ELSE p.price - i.avg_weighted_price END AS margin
     FROM item_prices p
     JOIN items i ON i.id = p.item_id
     WHERE p.price_list_id=$1 AND p.item_id=$2 AND p.company_id = current_setting('app.current_company_id')::int`,
    [listId, itemId]
  );
  if (!rows[0]) return res.status(404).end();
  res.json(rows[0]);
});

module.exports = { router, ensureReady };
