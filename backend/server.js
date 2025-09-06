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

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
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
