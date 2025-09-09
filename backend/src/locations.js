const express = require('express');
const PDFDocument = require('pdfkit');
let QRCode;
try {
  QRCode = require('qrcode');
} catch (err) {
  QRCode = { toDataURL: async () => '' };
}
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id INT REFERENCES locations(id) ON DELETE CASCADE
  )`);
})();

function buildTree(rows, parentId = null) {
  return rows
    .filter(r => r.parent_id === parentId)
    .map(r => ({ ...r, children: buildTree(rows, r.id) }));
}

router.get('/warehouses/:warehouseId/locations', async (req, res) => {
  const warehouseId = Number(req.params.warehouseId);
  const result = await db.query(
    'SELECT id, name, parent_id FROM locations WHERE warehouse_id=$1 ORDER BY id',
    [warehouseId]
  );
  res.json({ items: buildTree(result.rows) });
});

router.post('/warehouses/:warehouseId/locations', async (req, res) => {
  const warehouseId = Number(req.params.warehouseId);
  const { name, parent_id = null } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO locations(warehouse_id, name, parent_id) VALUES($1,$2,$3) RETURNING id, name, parent_id',
    [warehouseId, name, parent_id]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/locations/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT id, warehouse_id, name, parent_id FROM locations WHERE id=$1', [id]);
  const loc = result.rows[0];
  if (!loc) return res.status(404).end();
  res.json(loc);
});

router.put('/locations/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, parent_id } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) {
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid name' });
    fields.push('name');
    values.push(name);
  }
  if (parent_id !== undefined) {
    values.push(parent_id);
    fields.push('parent_id');
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const result = await db.query(`UPDATE locations SET ${fields.map((f,i)=>`${f}=$${i+1}`).join(', ')} WHERE id=$${fields.length+1} RETURNING id, warehouse_id, name, parent_id`, values);
  const loc = result.rows[0];
  if (!loc) return res.status(404).end();
  res.json(loc);
});

router.delete('/locations/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('DELETE FROM locations WHERE id=$1', [id]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

router.get('/locations/:id/label', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT id, name FROM locations WHERE id=$1', [id]);
  const loc = result.rows[0];
  if (!loc) return res.status(404).end();
  res.setHeader('Content-Type', 'application/pdf');
  const doc = new PDFDocument();
  doc.text(loc.name);
  const qr = await QRCode.toDataURL(String(id));
  const img = Buffer.from(qr.split(',')[1], 'base64');
  doc.image(img, { fit: [100, 100] });
  doc.pipe(res);
  doc.end();
});

module.exports = { router };
