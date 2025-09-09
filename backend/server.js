const express = require('express');
const {
  router: authRouter,
  authenticateToken,
} = require('./src/auth');
const items = require('./src/items');
const documents = require('./src/documents');
const lots = require('./src/lots');
const inventories = require('./src/inventories');
const labels = require('./src/labels');
const imports = require('./src/imports');
const storage = require('./src/storage');
const sequences = require('./src/sequences');
const causals = require('./src/causals');
const warehousesRouter = require('./src/warehouses');
const locationsRouter = require('./src/locations');
const transfersRouter = require('./src/transfers');
const db = require('./src/db');
const { calculateReorderPoint, calculateOrderQuantity } = require('./src/mrp');
const { sendPdf } = require('./src/mail');
const logger = require('./src/logger');
const { sendHealthAlert } = require('./src/alerts');
const path = require('path');

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS purchase_conditions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    terms TEXT
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    condition_id INTEGER REFERENCES purchase_conditions(id),
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    qty INTEGER NOT NULL,
    lot_id INTEGER,
    movement_id INTEGER
  )`);
})();

async function start(port = process.env.PORT || 3000) {
  await db
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

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use(authenticateToken);
  app.use('/items', items.router);
  app.use('/documents', documents.router);
  app.use('/lots', lots.router);
  app.use('/sequences', sequences.router);
  app.use('/causals', causals.router);
  app.use('/', inventories.router);
  app.use('/', labels.router);
  app.use('/', imports.router);
  app.use('/', storage.router);
  app.use('/warehouses', warehousesRouter.router);
  app.use('/', locationsRouter.router);
  app.use('/transfers', transfersRouter.router);

  // Suppliers and customers
  const suppliers = [];
  let nextSupplierId = 1;
  const customers = [];
  let nextCustomerId = 1;
  const warehouses = [];
  let nextWarehouseId = 1;
  // Simple in-memory store for users
  const userSettings = [];
  let nextUserId = 1;

  const jobQueue = [];
  const { version } = require('./package.json');

  // Simple in-memory stores for barcodes and settings
  const itemBarcodes = {};
  const settings = { defaultLabelTemplate: 'standard' };

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
  const mrpItems = [
    {
      item: 'item-active',
      avg_demand: 10,
      lead_time: 2,
      safety_stock: 5,
      active: true,
      supplier: 'Supplier A',
      current_stock: 0,
    },
    {
      item: 'item-inactive',
      avg_demand: 8,
      lead_time: 1,
      safety_stock: 2,
      active: false,
      supplier: 'Supplier B',
      current_stock: 0,
    },
    {
      item: 'item-nosupplier',
      avg_demand: 5,
      lead_time: 3,
      safety_stock: 1,
      active: true,
      supplier: null,
      current_stock: 0,
    },
  ];

  app.get('/mrp/suggestions', (req, res) => {
    const suggestions = mrpItems
      .filter((i) => i.active && i.supplier)
      .map((i) => {
        const rop = calculateReorderPoint(
          i.avg_demand,
          i.lead_time,
          i.safety_stock
        );
        const suggestedQty = calculateOrderQuantity(
          i.avg_demand,
          i.lead_time,
          i.current_stock,
          i.safety_stock
        );
        return {
          item: i.item,
          rop,
          avg_demand: i.avg_demand,
          suggested_qty: suggestedQty,
        };
      });
    res.json(suggestions);
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
      'SELECT id, item, qty, lot_id, movement_id FROM purchase_order_lines WHERE po_id=$1',
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
      'INSERT INTO purchase_orders(supplier, status, condition_id) VALUES($1,$2,$3) RETURNING id',
      [req.body.supplier || null, 'draft', req.body.condition_id || null]
    );
    const poId = poRes.rows[0].id;

    if (lines.length) {
      const placeholders = [];
      const values = [];
      lines.forEach((line, i) => {
        placeholders.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
        values.push(poId, line.item, line.qty, line.lot_id || null, line.movement_id || null);
      });
      await db.query(
        `INSERT INTO purchase_order_lines(po_id, item, qty, lot_id, movement_id) VALUES ${placeholders.join(',')}`,
        values
      );
    }

    const pdf = Buffer.from(`Purchase Order ${poId}`);
    if (req.body.email) {
      await sendPdf(req.body.email, `Purchase Order ${poId}`, pdf);
    }

    res.status(201).json({ id: poId });
  });

  app.patch('/purchase-orders/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const statuses = ['draft', 'confirmed', 'receiving', 'closed'];
    if (!statuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await db.query(
      'UPDATE purchase_orders SET status=$1 WHERE id=$2 RETURNING status',
      [status, id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.json({ status: row.status });
  });

  app.patch('/purchase-orders/:poId/lines/:lineId', async (req, res) => {
    const poId = Number(req.params.poId);
    const lineId = Number(req.params.lineId);
    const { lot_id = null, movement_id = null } = req.body;
    const result = await db.query(
      'UPDATE purchase_order_lines SET lot_id=$1, movement_id=$2 WHERE id=$3 AND po_id=$4 RETURNING *',
      [lot_id, movement_id, lineId, poId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.json(row);
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

  app.delete('/suppliers/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const idx = suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).end();
    suppliers.splice(idx, 1);
    res.status(204).end();
  });

  app.get('/suppliers/export', (req, res) => {
    const lines = ['id,name'];
    suppliers.forEach((s) => lines.push(`${s.id},${s.name}`));
    res.type('text/csv').send(lines.join('\n'));
  });

  // Purchase conditions APIs
  app.get('/purchase-conditions', async (req, res) => {
    const result = await db.query('SELECT * FROM purchase_conditions ORDER BY id');
    res.json({ items: result.rows });
  });

  app.get('/purchase-conditions/:id', async (req, res) => {
    const id = Number(req.params.id);
    const result = await db.query('SELECT * FROM purchase_conditions WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.json(row);
  });

  app.post('/purchase-conditions', async (req, res) => {
    const { name, terms } = req.body;
    const result = await db.query(
      'INSERT INTO purchase_conditions(name, terms) VALUES($1,$2) RETURNING *',
      [name || '', terms || null]
    );
    res.status(201).json(result.rows[0]);
  });

  app.put('/purchase-conditions/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { name, terms } = req.body;
    const result = await db.query(
      'UPDATE purchase_conditions SET name=$1, terms=$2 WHERE id=$3 RETURNING *',
      [name || '', terms || null, id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.json(row);
  });

  app.delete('/purchase-conditions/:id', async (req, res) => {
    const id = Number(req.params.id);
    await db.query('DELETE FROM purchase_conditions WHERE id=$1', [id]);
    res.status(204).end();
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
  // Warehouse APIs
  app.get('/warehouses', (req, res) => {
    res.json({ warehouses });
  });

  app.post('/warehouses', (req, res) => {
    const w = { id: nextWarehouseId++, name: req.body.name || '' };
    warehouses.push(w);
    res.status(201).json(w);
  });

  app.put('/warehouses/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const w = warehouses.find((w) => w.id === id);
    if (!w) return res.status(404).end();
    Object.assign(w, req.body);
    res.json(w);
  });

  // User management APIs
  app.get('/users', (req, res) => {
    res.json({ users: userSettings });
  });

  app.post('/users', (req, res) => {
    const u = {
      id: nextUserId++,
      name: req.body.name || '',
      role: req.body.role || 'user',
      warehouseId: req.body.warehouseId || null,
    };
    userSettings.push(u);
    res.status(201).json(u);
  });

  app.put('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const u = userSettings.find((u) => u.id === id);
    if (!u) return res.status(404).end();
    Object.assign(u, req.body);
    res.json(u);
  });
  app.get('/*splat', (req, res) => {
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
