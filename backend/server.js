const express = require('express');
const multer = require('multer');
const {
  router: authRouter,
  authenticateToken,
  rbac,
} = require('./src/auth');

function start(port = process.env.PORT || 3000) {
  const app = express();
  const upload = multer();
  app.use(express.json());

  app.use('/auth', authRouter);

  // In-memory stores for documents and movements
  const documents = [];
  let nextDocId = 1;
  const stockMovements = [];
  const inventories = [];
  let nextInvId = 1;
  // Suppliers, customers and import logs
  const suppliers = [];
  let nextSupplierId = 1;
  const customers = [];
  let nextCustomerId = 1;
  const importLogs = [];

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Document APIs
  app.get('/documents', (req, res) => {
    const { type } = req.query;
    const items = type ? documents.filter((d) => d.type === type) : documents;
    res.json({ items });
  });

  app.post('/documents', (req, res) => {
    const doc = {
      id: nextDocId++,
      type: req.body.type,
      status: req.body.status || 'draft',
      lines: req.body.lines || []
    };
    documents.push(doc);
    res.status(201).json(doc);
  });

  app.get('/documents/:id', (req, res) => {
    const doc = documents.find((d) => d.id == req.params.id);
    if (!doc) return res.status(404).end();
    res.json(doc);
  });

  app.post('/documents/:id/confirm', (req, res) => {
    const doc = documents.find((d) => d.id == req.params.id);
    if (!doc) return res.status(404).end();
    if (inventories.some((i) => i.status === 'frozen')) {
      return res.status(409).json({ error: 'Area frozen' });
    }
    doc.status = 'confirmed';
    const moves = Array.isArray(req.body.movements) ? req.body.movements : [];
    moves.forEach((m) => stockMovements.push({ documentId: doc.id, type: m }));
    res.json({ status: doc.status });
  });

  // MRP and Purchase Order APIs
  app.get('/mrp/suggestions', (req, res) => {
    // Return a minimal set of suggestions. In a real system this would be
    // calculated from stock levels and demand history.
    res.json([
      { item: 'demo-item', rop: 10, avg_demand: 5, suggested_qty: 15 },
    ]);
  });

  app.get('/purchase-orders', (req, res) => {
    const items = documents.filter((d) => d.type === 'po');
    res.json({ items });
  });

  app.get('/purchase-orders/:id', (req, res) => {
    const doc = documents.find(
      (d) => d.type === 'po' && d.id == req.params.id,
    );
    if (!doc) return res.status(404).end();
    res.json(doc);
  });

  app.post('/po', (req, res) => {
    const po = {
      id: nextDocId++,
      type: 'po',
      status: 'draft',
      lines: req.body.lines || [
        { item: req.body.item, qty: req.body.qty },
      ],
    };
    documents.push(po);
    res.status(201).json(po);
  });

  // Inventory APIs
  app.get('/inventories', (req, res) => {
    res.json({ items: inventories });
  });

  app.post('/inventories', (req, res) => {
    const inv = {
      id: nextInvId++,
      status: 'open',
      scope: req.body.scope || null,
      counts: [],
      differences: [],
      delta: []
    };
    inventories.push(inv);
    res.status(201).json(inv);
  });

  app.get('/inventories/:id', (req, res) => {
    const inv = inventories.find((i) => i.id == req.params.id);
    if (!inv) return res.status(404).end();
    res.json(inv);
  });

  app.post('/inventories/:id/freeze', (req, res) => {
    const inv = inventories.find((i) => i.id == req.params.id);
    if (!inv) return res.status(404).end();
    inv.status = 'frozen';
    res.json({ status: inv.status });
  });

  app.post('/inventories/:id/close', (req, res) => {
    const inv = inventories.find((i) => i.id == req.params.id);
    if (!inv) return res.status(404).end();
    inv.status = 'closed';
    // Dummy delta and report generation
    inv.delta = inv.delta || [];
    const report = Buffer.from('inventory report').toString('base64');
    res.json({ status: inv.status, delta: inv.delta, report });
  });

  app.get(
    '/warehouse/:warehouse_id/inventory',
    authenticateToken,
    rbac('inventory', 'read'),
    (req, res) => {
      res.json({ items: [] });
    }
  );

  app.post(
    '/warehouse/:warehouse_id/inventory',
    authenticateToken,
    rbac('inventory', 'write'),
    (req, res) => {
      res.status(201).json({ status: 'created' });
    }
  );

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

  // Generic import with logging
  app.post('/imports/:type', upload.single('file'), (req, res) => {
    const { type } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const text = req.file.buffer.toString('utf-8').trim();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows = lines.slice(1); // skip header
    let count = 0;
    rows.forEach((line) => {
      const [name] = line.split(',');
      if (!name) return;
      if (type === 'suppliers') {
        suppliers.push({ id: nextSupplierId++, name });
      } else if (type === 'customers') {
        customers.push({ id: nextCustomerId++, name });
      }
      count++;
    });
    importLogs.push({ type, count });
    res.json({ status: 'ok', count });
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
