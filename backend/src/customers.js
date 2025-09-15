const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  try {
    // Create customers table with company_id
    await db.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
    
    console.log('Customers module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize customers module:', error);
  }
})();

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'SELECT id, name FROM customers WHERE company_id = $1 ORDER BY id LIMIT $2 OFFSET $3',
    [companyId, limit, offset]
  );
  const totalRes = await db.query('SELECT COUNT(*) FROM customers WHERE company_id = $1', [companyId]);
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
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    `SELECT ${columns.join(', ')} FROM customers WHERE company_id = $1 ORDER BY id`,
    [companyId]
  );
  if (format === 'xlsx') {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Customers');
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
  const companyId = req.headers['x-company-id'] || 1;
  const result = await db.query('SELECT id, name FROM customers WHERE id=$1 AND company_id=$2', [id, companyId]);
  const cust = result.rows[0];
  if (!cust) return res.status(404).end();
  res.json(cust);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'INSERT INTO customers(name, company_id) VALUES($1, $2) RETURNING id, name',
    [name, companyId]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'UPDATE customers SET name=$1 WHERE id=$2 AND company_id=$3 RETURNING id, name',
    [name, id, companyId]
  );
  const cust = result.rows[0];
  if (!cust) return res.status(404).end();
  res.json(cust);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const companyId = req.headers['x-company-id'] || 1;
  const result = await db.query('DELETE FROM customers WHERE id=$1 AND company_id=$2', [id, companyId]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };

