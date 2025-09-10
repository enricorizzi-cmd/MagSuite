const express = require('express');
const db = require('./db');
const audit = require('./audit');

const router = express.Router();

// Ensure table exists before handling requests. The company_id column
// defaults to the value of the current company context so that items
// are automatically scoped per tenant.
const ready = (async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    lotti BOOLEAN DEFAULT false,
    seriali BOOLEAN DEFAULT false,
    company_id INTEGER NOT NULL REFERENCES companies(id) DEFAULT current_setting('app.current_company_id')::int
  )`);
})();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const result = await db.query(
    `SELECT id, name, sku, lotti, seriali FROM items WHERE company_id = current_setting('app.current_company_id')::int ORDER BY id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const totalRes = await db.query(
    `SELECT COUNT(*) FROM items WHERE company_id = current_setting('app.current_company_id')::int`
  );
  res.json({ items: result.rows, total: parseInt(totalRes.rows[0].count, 10) });
});

router.get('/export', async (req, res) => {
  const allowed = ['id', 'name', 'sku', 'lotti', 'seriali'];
  let columns = req.query.columns
    ? req.query.columns
        .split(',')
        .map((c) => c.trim())
        .filter((c) => allowed.includes(c))
    : allowed;
  if (columns.length === 0) columns = allowed;
  const format = (req.query.format || 'csv').toLowerCase();
  const result = await db.query(
    `SELECT ${columns.join(', ')} FROM items WHERE company_id = current_setting('app.current_company_id')::int ORDER BY id`
  );

  if (format === 'xlsx') {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Items');
    ws.addRow(columns);
    result.rows.forEach((row) => {
      ws.addRow(columns.map((c) => row[c]));
    });
    res.type(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const buffer = await wb.xlsx.writeBuffer();
    res.send(Buffer.from(buffer));
  } else {
    const lines = [columns.join(',')];
    result.rows.forEach((row) => {
      lines.push(columns.map((c) => row[c]).join(','));
    });
    res.type('text/csv').send(lines.join('\n'));
  }
});

router.post('/', async (req, res) => {
  let { name, sku, lotti = false, seriali = false } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  if (!sku || typeof sku !== 'string') {
    // Auto-generate a SKU if not provided
    sku = `SKU${Date.now()}`;
  }
  if (typeof lotti !== 'boolean' || typeof seriali !== 'boolean') {
    return res.status(400).json({ error: 'Invalid flags' });
  }
  const result = await db.query(
    'INSERT INTO items(name, sku, lotti, seriali) VALUES($1,$2,$3,$4) RETURNING id, name, sku, lotti, seriali',
    [name, sku, lotti, seriali]
  );
  const item = result.rows[0];
  audit.logAction(req.user.id, 'create_item', { item });
  res.status(201).json(item);
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const result = await db.query(
    `SELECT id, name, sku, lotti, seriali FROM items WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
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
  const oldRes = await db.query(
    `SELECT id, name, sku, lotti, seriali FROM items WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  if (oldRes.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const oldItem = oldRes.rows[0];
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
    `UPDATE items SET ${setClause} WHERE id=$${fields.length + 1} AND company_id = current_setting('app.current_company_id')::int RETURNING id, name, sku, lotti, seriali`,
    values
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const newItem = result.rows[0];
  const diff = {};
  Object.keys(newItem).forEach((key) => {
    if (newItem[key] !== oldItem[key]) {
      diff[key] = { old: oldItem[key], new: newItem[key] };
    }
  });
  audit.logAction(req.user.id, 'update_item', { id, diff });
  res.json(newItem);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const oldRes = await db.query(
    `SELECT id, name, sku, lotti, seriali FROM items WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  if (oldRes.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  await db.query(
    `DELETE FROM items WHERE id=$1 AND company_id = current_setting('app.current_company_id')::int`,
    [id]
  );
  audit.logAction(req.user.id, 'delete_item', { item: oldRes.rows[0] });
  res.status(204).send();
});

module.exports = { router, ready };
