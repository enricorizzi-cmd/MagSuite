const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  
  // Enable RLS and create policies
  await db.query('ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY');
  await db.query(`CREATE POLICY IF NOT EXISTS suppliers_select ON suppliers
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS suppliers_insert ON suppliers
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS suppliers_update ON suppliers
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS suppliers_delete ON suppliers
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int)`);
})();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const result = await db.query(
    'SELECT id, name FROM suppliers WHERE company_id = NULLIF(current_setting(\'app.current_company_id\', true), \'\')::int ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const totalRes = await db.query('SELECT COUNT(*) FROM suppliers WHERE company_id = NULLIF(current_setting(\'app.current_company_id\', true), \'\')::int');
  res.json({ items: result.rows, total: parseInt(totalRes.rows[0].count, 10) });
});

router.get('/export', async (req, res) => {
  const allowed = ['id', 'name'];
  let columns = req.query.columns
    ? req.query.columns
        .split(',')
        .map((c) => c.trim())
        .filter((c) => allowed.includes(c))
    : allowed;
  if (columns.length === 0) columns = allowed;
  const format = (req.query.format || 'csv').toLowerCase();
  const result = await db.query(
    `SELECT ${columns.join(', ')} FROM suppliers ORDER BY id`
  );
  if (format === 'xlsx') {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Suppliers');
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

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT id, name FROM suppliers WHERE id=$1', [id]);
  const sup = result.rows[0];
  if (!sup) return res.status(404).end();
  res.json(sup);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO suppliers(name) VALUES($1) RETURNING id, name',
    [name]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'UPDATE suppliers SET name=$1 WHERE id=$2 RETURNING id, name',
    [name, id]
  );
  const sup = result.rows[0];
  if (!sup) return res.status(404).end();
  res.json(sup);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('DELETE FROM suppliers WHERE id=$1', [id]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };

