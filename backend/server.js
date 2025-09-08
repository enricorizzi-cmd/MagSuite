const express = require('express');
const {
  router: authRouter,
} = require('./src/auth');
const items = require('./src/items');
const documents = require('./src/documents');
const inventories = require('./src/inventories');
const labels = require('./src/labels');
const imports = require('./src/imports');
const pool = require('./src/db');
const db = pool;
const { calculateReorderPoint, calculateOrderQuantity } = require('./src/mrp');
const { sendPdf } = require('./src/mail');
const logger = require('./src/logger');
const { sendHealthAlert } = require('./src/alerts');
const path = require('path');

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    qty INTEGER NOT NULL
  )`);
})();

async function start(port = process.env.PORT || 3000) {
  await pool
    .connect()
    .then((client) => client.release())
    .then(() => console.log('Database connection established'))
    .catch((err) => {
      console.error('Failed to connect to database', err);
      process.exit(1);
    });

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  app.use(express.static('public'));

  app.use('/auth', authRouter);
  app.use('/items', items.router);
  app.use('/documents', documents.router);
  app.use('/', inventories.router);
  app.use('/', labels.router);
  app.use('/', imports.router);

  // Suppliers and customers
  const suppliers = [];
  let nextSupplierId = 1;
  const customers = [];
  let nextCustomerId = 1;

  const jobQueue = [];
  const { version } = require('./package.json');

  // Simple in-memory stores for barcodes and settings
  const itemBarcodes = {};
  const settings = { defaultLabelTemplate: 'standard' };

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/system/status', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ version, migrations: [], jobs: jobQueue });
    } catch (err) {
      logger.error('Health check failed', err);
      await sendHealthAlert(err.message);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Dashboard reports
  app.get('/reports/dashboard', (req, res) => {
    res.json({
      kpis: { inventory: 0, orders: 0 },
      charts: { sales: [] },
    });
  });

  // Alerts endpoint
  app.get('/alerts', (req, res) => {
    res.json([
      { id: 1, message: 'Sample alert' },
    ]);
  });

  // Settings APIs
  app.get('/settings', (req, res) => {
    res.json(settings);
  });

  app.put('/settings', (req, res) => {
    Object.assign(settings, req.body);
    res.json(settings);
  });

  // Barcode APIs
  app.get('/items/:id/barcodes', (req, res) => {
    const { id } = req.params;
    res.json(itemBarcodes[id] || []);
  });

  app.post('/items/:id/barcodes', (req, res) => {
    const { id } = req.params;
    if (Array.isArray(req.body)) {
      itemBarcodes[id] = req.body;
      return res.json({ status: 'ok' });
    }
    const code = `BC${Math.random().toString().slice(2, 10)}`;
    if (!itemBarcodes[id]) itemBarcodes[id] = [];
    itemBarcodes[id].push(code);
    res.status(201).json({ barcode: code });
  });

  // MRP and Purchase Order APIs
  app.get('/mrp/suggestions', (req, res) => {
    // In a real system these would come from inventory and demand data.
    const avgDemand = 5;
    const leadTime = 2;
    const rop = calculateReorderPoint(avgDemand, leadTime);
    const suggestedQty = calculateOrderQuantity(avgDemand, leadTime, 0);
    res.json([
      { item: 'demo-item', rop, avg_demand: avgDemand, suggested_qty: suggestedQty },
    ]);
  });

  app.get('/purchase-orders', async (req, res) => {
    const result = await db.query('SELECT * FROM purchase_orders ORDER BY id');
    res.json({ items: result.rows });
  });

  app.get('/purchase-orders/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const poRes = await db.query('SELECT * FROM purchase_orders WHERE id=$1', [id]);
    const po = poRes.rows[0];
    if (!po) return res.status(404).end();
    const linesRes = await db.query(
      'SELECT item, qty FROM purchase_order_lines WHERE po_id=$1',
      [id]
    );
    po.lines = linesRes.rows;
    res.json(po);
  });

  app.post('/po', async (req, res) => {
    const lines = req.body.lines || [
      { item: req.body.item, qty: req.body.qty },
    ];
    const poRes = await db.query(
      'INSERT INTO purchase_orders(supplier) VALUES($1) RETURNING id',
      [req.body.supplier || null]
    );
    const poId = poRes.rows[0].id;

    if (lines.length) {
      const placeholders = [];
      const values = [];
      lines.forEach((line, i) => {
        placeholders.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
        values.push(poId, line.item, line.qty);
      });
      await db.query(
        `INSERT INTO purchase_order_lines(po_id, item, qty) VALUES ${placeholders.join(',')}`,
        values
      );
    }

    const pdf = Buffer.from(`Purchase Order ${poId}`);
    if (req.body.email) {
      await sendPdf(req.body.email, `Purchase Order ${poId}`, pdf);
    }

    res.status(201).json({ id: poId });
  });

  // Inventory APIs
  // Supplier APIs
  app.get('/suppliers', (req, res) => {
    res.json({ items: suppliers });
  });

  app.get('/suppliers/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const sup = suppliers.find((s) => s.id === id);
    if (!sup) return res.status(404).end();
    res.json(sup);
  });

  app.post('/suppliers', (req, res) => {
    const sup = { id: nextSupplierId++, name: req.body.name || '' };
    suppliers.push(sup);
    res.status(201).json(sup);
  });

  app.put('/suppliers/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const sup = suppliers.find((s) => s.id === id);
    if (!sup) return res.status(404).end();
    Object.assign(sup, req.body);
    res.json(sup);
  });

  app.get('/suppliers/export', (req, res) => {
    const lines = ['id,name'];
    suppliers.forEach((s) => lines.push(`${s.id},${s.name}`));
    res.type('text/csv').send(lines.join('\n'));
  });

  // Customer APIs
  app.get('/customers', (req, res) => {
    res.json({ items: customers });
  });

  app.get('/customers/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const cust = customers.find((c) => c.id === id);
    if (!cust) return res.status(404).end();
    res.json(cust);
  });

  app.post('/customers', (req, res) => {
    const cust = { id: nextCustomerId++, name: req.body.name || '' };
    customers.push(cust);
    res.status(201).json(cust);
  });

  app.put('/customers/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const cust = customers.find((c) => c.id === id);
    if (!cust) return res.status(404).end();
    Object.assign(cust, req.body);
    res.json(cust);
  });

  app.get('/customers/export', (req, res) => {
    const lines = ['id,name'];
    customers.forEach((c) => lines.push(`${c.id},${c.name}`));
    res.type('text/csv').send(lines.join('\n'));
  });
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const server = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
