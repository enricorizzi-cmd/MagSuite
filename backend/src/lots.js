const express = require('express');
const db = require('./db');

const router = express.Router();

const ready = (async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    lot TEXT NOT NULL,
    expiry DATE,
    status TEXT NOT NULL DEFAULT 'active',
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
})();

router.get('/expiring', async (req, res) => {
  const days = Math.max(parseInt(req.query.days) || 30, 0);
  const target = new Date();
  target.setDate(target.getDate() + days);
  const result = await db.query(
    "SELECT * FROM lots WHERE expiry IS NOT NULL AND expiry <= $1 AND status <> $2 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int ORDER BY expiry",
    [target.toISOString().slice(0, 10), 'disposed']
  );
  res.json({ items: result.rows });
});

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.query(
    "SELECT * FROM lots WHERE company_id = NULLIF(current_setting('app.current_company_id', true), '')::int ORDER BY id LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { item_id, lot, expiry = null } = req.body;
  if (!item_id || !lot || typeof lot !== 'string') {
    return res.status(400).json({ error: 'Invalid lot data' });
  }
  const result = await db.query(
    'INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING *',
    [item_id, lot, expiry]
  );
  res.status(201).json(result.rows[0]);
});

router.post('/:id/block', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "UPDATE lots SET status=$1 WHERE id=$2 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int RETURNING status",
    ['blocked', id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ status: row.status });
});

router.post('/:id/unblock', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "UPDATE lots SET status=$1 WHERE id=$2 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int RETURNING status",
    ['active', id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ status: row.status });
});

router.post('/:id/dispose', async (req, res) => {
  const id = Number(req.params.id);
  const lotRes = await db.query(
    "SELECT item_id, expiry, status FROM lots WHERE id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int",
    [id]
  );
  const lot = lotRes.rows[0];
  if (!lot) return res.status(404).end();
  if (lot.status === 'disposed') {
    return res.status(409).json({ error: 'Already disposed' });
  }
  if (lot.expiry && new Date(lot.expiry) > new Date()) {
    return res.status(409).json({ error: 'Lot not expired' });
  }
  const qtyRes = await db.query(
    "SELECT warehouse_id, SUM(quantity) AS qty FROM stock_movements WHERE lot_id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int GROUP BY warehouse_id",
    [id]
  );
  for (const row of qtyRes.rows) {
    const qty = Number(row.qty);
    if (qty > 0) {
      await db.query(
        `INSERT INTO stock_movements(document_id, item_id, warehouse_id, quantity, lot_id, expiry)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [null, lot.item_id, row.warehouse_id, -qty, id, lot.expiry]
      );
    }
  }
  await db.query('UPDATE lots SET status=$1 WHERE id=$2', ['disposed', id]);
  res.json({ status: 'disposed' });
});

module.exports = { router, ready };
