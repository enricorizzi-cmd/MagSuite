const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    source_location_id INT REFERENCES locations(id),
    dest_location_id INT REFERENCES locations(id),
    quantity NUMERIC NOT NULL,
    status TEXT DEFAULT 'draft',
    document_id INT REFERENCES documents(id)
  )`);
})();

router.get('/', async (req, res) => {
  const result = await db.query(
    "SELECT * FROM transfers ORDER BY id"
  );
  res.json({ items: result.rows });
});

router.post('/', async (req, res) => {
  const { item_id, source_location_id, dest_location_id, quantity } = req.body;
  if (!item_id || !source_location_id || !dest_location_id || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const result = await db.query(
    'INSERT INTO transfers(item_id, source_location_id, dest_location_id, quantity) VALUES($1,$2,$3,$4) RETURNING *',
    [item_id, source_location_id, dest_location_id, quantity]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "SELECT * FROM transfers WHERE id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int",
    [id]
  );
  const tr = result.rows[0];
  if (!tr) return res.status(404).end();
  res.json(tr);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { item_id, source_location_id, dest_location_id, quantity } = req.body;
  const fields = [];
  const values = [];
  if (item_id !== undefined) { fields.push('item_id'); values.push(item_id); }
  if (source_location_id !== undefined) { fields.push('source_location_id'); values.push(source_location_id); }
  if (dest_location_id !== undefined) { fields.push('dest_location_id'); values.push(dest_location_id); }
  if (quantity !== undefined) { fields.push('quantity'); values.push(quantity); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const result = await db.query(`UPDATE transfers SET ${fields.map((f,i)=>`${f}=$${i+1}`).join(', ')} WHERE id=$${fields.length+1} AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int RETURNING *`, values);
  const tr = result.rows[0];
  if (!tr) return res.status(404).end();
  res.json(tr);
});

router.post('/:id/confirm', async (req, res) => {
  const id = Number(req.params.id);
  const trRes = await db.query(
    "SELECT * FROM transfers WHERE id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int",
    [id]
  );
  const tr = trRes.rows[0];
  if (!tr) return res.status(404).end();
  if (tr.status !== 'draft') return res.status(400).json({ error: 'Already done' });
  const src = await db.query('SELECT warehouse_id FROM locations WHERE id=$1', [tr.source_location_id]);
  const dst = await db.query('SELECT warehouse_id FROM locations WHERE id=$1', [tr.dest_location_id]);
  const srcWh = src.rows[0] && src.rows[0].warehouse_id;
  const dstWh = dst.rows[0] && dst.rows[0].warehouse_id;
  if (!srcWh || !dstWh) return res.status(400).json({ error: 'Invalid locations' });
  const docRes = await db.query("INSERT INTO documents(type, status) VALUES('transfer','confirmed') RETURNING id");
  const docId = docRes.rows[0].id;
  await db.query(
    'INSERT INTO stock_movements(document_id,item_id,warehouse_id,quantity) VALUES($1,$2,$3,$4),($1,$2,$5,$6)',
    [docId, tr.item_id, srcWh, -tr.quantity, dstWh, tr.quantity]
  );
  await db.query('UPDATE transfers SET status=$1, document_id=$2 WHERE id=$3', ['done', docId, id]);
  res.json({ status: 'done', document_id: docId });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('DELETE FROM transfers WHERE id=$1', [id]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };
