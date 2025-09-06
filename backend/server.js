const express = require('express');
const {
  router: authRouter,
  authenticateToken,
  rbac,
} = require('./src/auth');

function start(port = process.env.PORT || 3000) {
  const app = express();
  app.use(express.json());

  app.use('/auth', authRouter);

  // In-memory stores for documents and movements
  const documents = [];
  let nextDocId = 1;
  const stockMovements = [];
  const inventories = [];
  let nextInvId = 1;

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

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
