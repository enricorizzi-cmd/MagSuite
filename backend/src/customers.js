const express = require('express');
const db = require('./db');

const router = express.Router();

const customerColumns = [
  'id',
  'code',
  'name',
  'vat_number',
  'tax_code',
  'email',
  'phone',
  'address',
  'city',
  'province',
  'postal_code',
  'country',
  'payment_terms',
  'price_list',
  'agent',
  'classifier_a',
  'classifier_b',
  'classifier_c',
  'notes',
  'created_at',
  'updated_at'
];
const editableColumns = customerColumns.filter((key) => !['id', 'created_at', 'updated_at'].includes(key));

(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      code TEXT,
      name TEXT NOT NULL,
      vat_number TEXT,
      tax_code TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      postal_code TEXT,
      country TEXT,
      payment_terms TEXT,
      price_list TEXT,
      agent TEXT,
      classifier_a TEXT,
      classifier_b TEXT,
      classifier_c TEXT,
      notes TEXT,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);

    const alters = [
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS code TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_number TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_code TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS province TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS agent TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS classifier_a TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS classifier_b TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS classifier_c TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) DEFAULT 1',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()'
    ];
    for (const statement of alters) {
      await db.query(statement);
    }

    await db.query('CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id)');
    await db.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_company_code ON customers(company_id, code)');

    const demoCode = 'CLIENTE-DEMO';
    const { rows } = await db.query(
      'SELECT 1 FROM customers WHERE code = $1 AND company_id = $2 LIMIT 1',
      [demoCode, 1]
    );
    if (!rows.length) {
      await db.query(
        `INSERT INTO customers (
          code, name, vat_number, tax_code, email, phone,
          address, city, province, postal_code, country,
          payment_terms, price_list, agent,
          classifier_a, classifier_b, classifier_c,
          notes, company_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17,
          $18, $19
        )`,
        [
          demoCode,
          'Cliente Demo Srl',
          'IT12345678901',
          'RSSMRA80A01F205X',
          'demo@cliente.it',
          '+39 055 1234567',
          'Via dei Test 123',
          'Firenze',
          'FI',
          '50100',
          'Italia',
          '30 giorni fm',
          'Listino Retail',
          'Agente Centro Nord',
          'Canale Modern Trade',
          'Area Centro Italia',
          'Segmento Premium',
          'Cliente demo con classificatori completi',
          1
        ]
      );
      console.log('Demo customer created');
    }

    console.log('Customers module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize customers module:', error);
  }
})();

function companyIdFrom(req) {
  const header = req.headers['x-company-id'];
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  const companyId = companyIdFrom(req);

  const result = await db.query(
    `SELECT ${customerColumns.join(', ')}
     FROM customers
     WHERE company_id = $1
     ORDER BY id
     LIMIT $2 OFFSET $3`,
    [companyId, limit, offset]
  );
  const totalRes = await db.query('SELECT COUNT(*) FROM customers WHERE company_id = $1', [companyId]);
  res.json({ items: result.rows, total: parseInt(totalRes.rows[0].count, 10) });
});

router.get('/export', async (req, res) => {
  const allowed = customerColumns;
  let columns = req.query.columns
    ? req.query.columns
        .split(',')
        .map((c) => c.trim())
        .filter((c) => allowed.includes(c))
    : allowed;
  if (!columns.length) columns = allowed;
  const format = (req.query.format || 'csv').toLowerCase();
  const companyId = companyIdFrom(req);

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
  const companyId = companyIdFrom(req);
  const result = await db.query(
    `SELECT ${customerColumns.join(', ')} FROM customers WHERE id=$1 AND company_id=$2`,
    [id, companyId]
  );
  const cust = result.rows[0];
  if (!cust) return res.status(404).end();
  res.json(cust);
});

function buildPayload(body) {
  const payload = {};
  editableColumns.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      payload[key] = body[key];
    }
  });
  return payload;
}

router.post('/', async (req, res) => {
  const body = buildPayload(req.body || {});
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ error: 'Name required' });
  }
  if (!body.code || typeof body.code !== 'string' || !body.code.trim()) {
    return res.status(400).json({ error: 'Code required' });
  }
  const companyId = companyIdFrom(req);

  const columns = Object.keys(body);
  const values = columns.map((key) => body[key]);
  const params = columns.map((_, idx) => `$${idx + 1}`);
  columns.push('company_id');
  values.push(companyId);
  params.push(`$${values.length}`);

  const query = `
    INSERT INTO customers (${columns.join(', ')})
    VALUES (${params.join(', ')})
    RETURNING ${customerColumns.join(', ')}
  `;
  try {
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const companyId = companyIdFrom(req);
  const body = buildPayload(req.body || {});
  if (Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const sets = [];
  const values = [];
  Object.entries(body).forEach(([key, value]) => {
    values.push(value);
    sets.push(`${key} = $${values.length}`);
  });
  sets.push('updated_at = now()');
  values.push(id);
  values.push(companyId);
  const query = `
    UPDATE customers
    SET ${sets.join(', ')}
    WHERE id = $${values.length - 1} AND company_id = $${values.length}
    RETURNING ${customerColumns.join(', ')}
  `;
  try {
    const result = await db.query(query, values);
    const cust = result.rows[0];
    if (!cust) return res.status(404).end();
    res.json(cust);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const companyId = companyIdFrom(req);
  const result = await db.query('DELETE FROM customers WHERE id=$1 AND company_id=$2', [id, companyId]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };
