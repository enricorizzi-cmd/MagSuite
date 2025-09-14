const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('./db');

const router = express.Router();

const ready = (async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    causal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    lines JSONB DEFAULT '[]',
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    lot TEXT NOT NULL,
    expiry DATE,
    status TEXT NOT NULL DEFAULT 'active',
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS serials (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    serial TEXT NOT NULL,
    expiry DATE,
    blocked BOOLEAN DEFAULT false,
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
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
    moved_at TIMESTAMPTZ DEFAULT now(),
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  await db.query(
    "ALTER TABLE lots ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'"
  );
  await db.query(
    'ALTER TABLE serials ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false'
  );
})();

router.get('/', async (req, res) => {
  const { type, causal, from, to, item } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  let query = 'SELECT * FROM documents';
  const params = [];
  const conditions = [];
  // Scope to current company explicitly
  params.push(req.user.company_id);
  conditions.push(`company_id = $${params.length}`);
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (causal) {
    params.push(causal);
    conditions.push(`causal = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }
  if (item) {
    params.push(`%${item}%`);
    conditions.push(`lines::text ILIKE $${params.length}`);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  params.push(limit, offset);
  query += ` ORDER BY id LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const result = await db.query(query, params);
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { type, lines = [], causal = null } = req.body;
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Type required' });
  }
  const result = await db.query(
    'INSERT INTO documents(type, causal, lines) VALUES($1, $2, $3::jsonb) RETURNING *',
    [type, causal, JSON.stringify(lines)]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM documents WHERE id=$1 AND company_id=$2', [id, req.user.company_id]);
  const doc = result.rows[0];
  if (!doc) return res.status(404).end();
  res.json(doc);
});

router.post('/:id/confirm', async (req, res) => {
  const id = Number(req.params.id);
  const docRes = await db.query('SELECT * FROM documents WHERE id=$1 AND company_id=$2', [id, req.user.company_id]);
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
    if (lot_id) {
      const lotRes = await db.query('SELECT expiry, status FROM lots WHERE id=$1', [
        lot_id,
      ]);
      const lot = lotRes.rows[0];
      if (lot?.status === 'blocked' || lot?.status === 'disposed') {
        return res.status(409).json({ error: 'Lot blocked' });
      }
      if (lot?.expiry && new Date(lot.expiry) < new Date()) {
        return res.status(409).json({ error: 'Lot expired' });
      }
      if (!exp) exp = lot ? lot.expiry : null;
    }
    if (serial_id) {
      const serialRes = await db.query('SELECT expiry, blocked FROM serials WHERE id=$1', [
        serial_id,
      ]);
      const serial = serialRes.rows[0];
      if (serial?.blocked) {
        return res.status(409).json({ error: 'Serial blocked' });
      }
      if (serial?.expiry && new Date(serial.expiry) < new Date()) {
        return res.status(409).json({ error: 'Serial expired' });
      }
      if (!exp) exp = serial ? serial.expiry : null;
    }

    if (quantity < 0) {
      // Check if stock_movements table exists before querying
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'stock_movements'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        const params = [item_id, warehouse_id];
        let condition = 'item_id=$1 AND warehouse_id=$2';
        if (lot_id) {
          params.push(lot_id);
          condition += ` AND lot_id=$${params.length}`;
        } else {
          condition += ' AND lot_id IS NULL';
        }
        if (serial_id) {
          params.push(serial_id);
          condition += ` AND serial_id=$${params.length}`;
        } else {
          condition += ' AND serial_id IS NULL';
        }
        const availRes = await db.query(
          `SELECT COALESCE(SUM(quantity),0) AS qty FROM stock_movements WHERE ${condition} AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int`,
          params
        );
        const available = Number(availRes.rows[0].qty);
        if (available + quantity < 0) {
          return res.status(409).json({ error: 'Insufficient quantity' });
        }
      }
      // If stock_movements table doesn't exist, skip quantity check
    }
    // Check if stock_movements table exists before inserting
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      await db.query(
        `INSERT INTO stock_movements(document_id, item_id, warehouse_id, quantity, lot_id, serial_id, expiry)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, item_id, warehouse_id, quantity, lot_id, serial_id, exp]
      );
    }
    // If stock_movements table doesn't exist, skip the insert
  }
  await db.query('UPDATE documents SET status=$1 WHERE id=$2', [
    'confirmed',
    id,
  ]);
  res.json({ status: 'confirmed' });
});

router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'UPDATE documents SET status=$1 WHERE id=$2 AND company_id=$3 RETURNING status',
    ['cancelled', id, req.user.company_id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ status: row.status });
});

router.get('/:id/print', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM documents WHERE id=$1 AND company_id=$2', [id, req.user.company_id]);
  const doc = result.rows[0];
  if (!doc) return res.status(404).end();
  const pdf = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  pdf.pipe(res);
  pdf.text(`Document ${doc.id} (${doc.type})`);
  if (doc.causal) pdf.text(`Causale: ${doc.causal}`);
  pdf.text(`Status: ${doc.status}`);
  if (doc.created_at) pdf.text(`Date: ${doc.created_at}`);
  const lines = Array.isArray(doc.lines) ? doc.lines : [];
  for (const l of lines) {
    const parts = [l.barcode];
    if (l.lot) parts.push(`Lot: ${l.lot}`);
    if (l.serial) parts.push(`Serial: ${l.serial}`);
    pdf.text(parts.filter(Boolean).join(' '));
  }
  pdf.end();
});

async function selectNextBatch(item_id, warehouse_id) {
  const strategy = process.env.BATCH_STRATEGY === 'FIFO' ? 'FIFO' : 'FEFO';
  const result = await db.query(
    `SELECT lot_id, serial_id, expiry, qty, first_movement FROM (
       SELECT lot_id, serial_id, expiry, SUM(quantity) AS qty, MIN(moved_at) AS first_movement
       FROM stock_movements
       WHERE item_id=$1 AND warehouse_id=$2 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int
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
