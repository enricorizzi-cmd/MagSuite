const express = require('express');
const db = require('./db');

const router = express.Router();

const ready = (async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    lines JSONB DEFAULT '[]'
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    lot TEXT NOT NULL,
    expiry DATE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS serials (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    serial TEXT NOT NULL,
    expiry DATE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id),
    item_id INT REFERENCES items(id),
    warehouse_id INT REFERENCES warehouses(id),
    quantity NUMERIC NOT NULL,
    lot_id INT REFERENCES lots(id),
    serial_id INT REFERENCES serials(id),
    expiry DATE,
    moved_at TIMESTAMPTZ DEFAULT now()
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
    const {
      item_id,
      warehouse_id,
      quantity,
      lot_id = null,
      serial_id = null,
      expiry = null,
    } = m;
    if (!item_id || !warehouse_id || typeof quantity !== 'number') {
      return res.status(400).json({ error: 'Invalid movement' });
    }
    const itemRes = await db.query('SELECT lotti, seriali FROM items WHERE id=$1', [
      item_id,
    ]);
    const item = itemRes.rows[0];
    if (item?.lotti && !lot_id) {
      return res.status(400).json({ error: 'lot_id required' });
    }
    if (item?.seriali && !serial_id) {
      return res.status(400).json({ error: 'serial_id required' });
    }
    let exp = expiry;
    if (!exp && lot_id) {
      const lotRes = await db.query('SELECT expiry FROM lots WHERE id=$1', [
        lot_id,
      ]);
      exp = lotRes.rows[0] ? lotRes.rows[0].expiry : null;
    }
    await db.query(
      `INSERT INTO stock_movements(document_id, item_id, warehouse_id, quantity, lot_id, serial_id, expiry)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [id, item_id, warehouse_id, quantity, lot_id, serial_id, exp]
    );
  }
  await db.query('UPDATE documents SET status=$1 WHERE id=$2', [
    'confirmed',
    id,
  ]);
  res.json({ status: 'confirmed' });
});

async function selectNextBatch(item_id, warehouse_id) {
  const strategy = process.env.BATCH_STRATEGY === 'FEFO' ? 'FEFO' : 'FIFO';
  const result = await db.query(
    `SELECT lot_id, serial_id, expiry, qty, first_movement FROM (
       SELECT lot_id, serial_id, expiry, SUM(quantity) AS qty, MIN(moved_at) AS first_movement
       FROM stock_movements
       WHERE item_id=$1 AND warehouse_id=$2
       GROUP BY lot_id, serial_id, expiry
     ) s
     WHERE qty > 0
     ORDER BY ${strategy === 'FEFO' ? 'expiry NULLS LAST, first_movement' : 'first_movement'}
     LIMIT 1`,
    [item_id, warehouse_id]
  );
  return result.rows[0] || null;
}

module.exports = { router, selectNextBatch, ready };
