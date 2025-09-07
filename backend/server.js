const express = require('express');
const multer = require('multer');
const {
  router: authRouter,
  authenticateToken,
  rbac,
} = require('./src/auth');
const items = require('./src/items');
const documents = require('./src/documents');
const inventories = require('./src/inventories');
const db = require('./db');

function start(port = process.env.PORT || 3000) {
  const app = express();
  const upload = multer();
  app.use(express.json());

  app.use('/auth', authRouter);
  app.use('/items', items.router);
  app.use('/documents', documents.router);
  app.use('/', inventories.router);

  // Suppliers, customers and import logs
  const suppliers = [];
  let nextSupplierId = 1;
  const customers = [];
  let nextCustomerId = 1;
  const importLogs = [];
  let nextImportId = 1;

  const jobQueue = [];
  const { version } = require('./package.json');

  // Simple in-memory stores for barcodes and settings
  const itemBarcodes = {};
  const settings = { defaultLabelTemplate: 'standard' };

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/system/status', (req, res) => {
    res.json({ version, migrations: [], jobs: jobQueue });
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

  // Label rendering API
  app.get('/labels/:template', (req, res) => {
    const { template } = req.params;
    const { item_id, format = 'pdf' } = req.query;
    const content = Buffer.from(
      `Label ${template} for item ${item_id}`,
    ).toString('base64');
    res.json({ format, content });
  });

  // MRP and Purchase Order APIs
  app.get('/mrp/suggestions', (req, res) => {
    // Return a minimal set of suggestions. In a real system this would be
    // calculated from stock levels and demand history.
    res.json([
      { item: 'demo-item', rop: 10, avg_demand: 5, suggested_qty: 15 },
    ]);
  });

  app.get('/purchase-orders', async (req, res) => {
    const result = await db.query(
      "SELECT * FROM documents WHERE type='po'"
    );
    res.json({ items: result.rows });
  });

  app.get('/purchase-orders/:id', async (req, res) => {
    const result = await db.query(
      "SELECT * FROM documents WHERE type='po' AND id=$1",
      [req.params.id]
    );
    const doc = result.rows[0];
    if (!doc) return res.status(404).end();
    res.json(doc);
  });

  app.post('/po', async (req, res) => {
    const lines = req.body.lines || [
      { item: req.body.item, qty: req.body.qty },
    ];
    const result = await db.query(
      "INSERT INTO documents(type, status, lines) VALUES('po','draft',$1::jsonb) RETURNING *",
      [JSON.stringify(lines)]
    );
    res.status(201).json(result.rows[0]);
  });

  // Inventory APIs
  // Supplier APIs
  app.get('/suppliers', (req, res) => {
    res.json({ items: suppliers });
  });

  app.get('/suppliers/:id', (req, res) => {
    const sup = suppliers.find((s) => s.id == req.params.id);
    if (!sup) return res.status(404).end();
    res.json(sup);
  });

  app.post('/suppliers', (req, res) => {
    const sup = { id: nextSupplierId++, name: req.body.name || '' };
    suppliers.push(sup);
    res.status(201).json(sup);
  });

  app.put('/suppliers/:id', (req, res) => {
    const sup = suppliers.find((s) => s.id == req.params.id);
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
    const cust = customers.find((c) => c.id == req.params.id);
    if (!cust) return res.status(404).end();
    res.json(cust);
  });

  app.post('/customers', (req, res) => {
    const cust = { id: nextCustomerId++, name: req.body.name || '' };
    customers.push(cust);
    res.status(201).json(cust);
  });

  app.put('/customers/:id', (req, res) => {
    const cust = customers.find((c) => c.id == req.params.id);
    if (!cust) return res.status(404).end();
    Object.assign(cust, req.body);
    res.json(cust);
  });

  app.get('/customers/export', (req, res) => {
    const lines = ['id,name'];
    customers.forEach((c) => lines.push(`${c.id},${c.name}`));
    res.type('text/csv').send(lines.join('\n'));
  });

  app.get('/system/imports', (req, res) => {
    res.json(importLogs.map(({ id, type, count }) => ({ id, type, count })));
  });

  app.get('/imports/:id/log', (req, res) => {
    const log = importLogs.find((l) => l.id == req.params.id);
    if (!log) return res.status(404).end();
    res.json({ log: log.log || [] });
  });

  app.get('/imports/:id/file', (req, res) => {
    const log = importLogs.find((l) => l.id == req.params.id);
    if (!log) return res.status(404).end();
    res.json({ filename: log.filename, content: log.file.toString('base64') });
  });

  // Generic import with logging
  app.post('/imports/:type', upload.single('file'), (req, res) => {
    const { type } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const text = req.file.buffer.toString('utf-8').trim();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(1); // skip header
    let count = 0;
    const log = [];
    rows.forEach((line, idx) => {
      const [name] = line.split(',');
      if (!name) {
        log.push({ line: idx + 2, message: 'Missing name', error: true });
        return;
      }
      if (type === 'suppliers') {
        suppliers.push({ id: nextSupplierId++, name });
      } else if (type === 'customers') {
        customers.push({ id: nextCustomerId++, name });
      }
      count++;
      log.push({ line: idx + 2, message: `Imported ${name}`, error: false });
    });
    const id = nextImportId++;
    importLogs.push({
      id,
      type,
      count,
      log,
      file: req.file.buffer,
      filename: req.file.originalname,
    });
    res.json({ status: 'ok', count, id });
  });

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
