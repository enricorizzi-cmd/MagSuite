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
    doc.status = 'confirmed';
    const moves = Array.isArray(req.body.movements) ? req.body.movements : [];
    moves.forEach((m) => stockMovements.push({ documentId: doc.id, type: m }));
    res.json({ status: doc.status });
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
