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
const logsRouter = require('./src/logs');
const operations = require('./src/operations');
const customersRouter = require('./src/customers');
const suppliersRouter = require('./src/suppliers');
const usersRouter = require('./src/users');
const db = require('./src/db');
const { runTenantBackups } = require('./src/backup');
const cron = require('node-cron');
const { calculateReorderPoint, calculateOrderQuantity } = require('./src/mrp');
const { sendPdf } = require('./src/mail');
const logger = require('./src/logger');
const { sendHealthAlert } = require('./src/alerts');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

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
  await db.query(`CREATE TABLE IF NOT EXISTS report_views (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS report_schedules (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    run_at TIMESTAMPTZ NOT NULL
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

  // Ensure tables for modules are ready before registering routes
  await Promise.all([
    items.ready,
    documents.ready,
    sequences.ready,
    causals.ready,
  ]);

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

  // Public routes
  app.use('/auth', authRouter);

  const jobQueue = [];
  const { version } = require('./package.json');
  const itemBarcodes = {};

  // Company-level settings persisted in DB
  await db.query(`CREATE TABLE IF NOT EXISTS company_settings (
    company_id INTEGER PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb
  )`);

  const defaultSettings = {
    general: { companyName: '' },
    classifiers: { defaultCategory: '' },
    itemsTable: {
      columns: [
        'name','sku','code','description','barcode',
        'type','category','group','class',
        'manufacturer','distributor','supplier','notes',
        'size','color','purchase_price','avg_weighted_price','min_stock','rotation_index',
        'quantity_on_hand','last_purchase_date'
      ],
      aliases: {}
    },
    defaultLabelTemplate: 'standard'
  };

  async function getCompanySettings(companyId) {
    const { rows } = await db.query('SELECT settings FROM company_settings WHERE company_id=$1', [companyId]);
    if (!rows[0]) return defaultSettings;
    const s = rows[0].settings || {};
    return {
      ...defaultSettings,
      ...s,
      itemsTable: { ...defaultSettings.itemsTable, ...(s.itemsTable || {}) },
    };
  }

  async function saveCompanySettings(companyId, patch) {
    const current = await getCompanySettings(companyId);
    const next = {
      ...current,
      ...patch,
      itemsTable: { ...current.itemsTable, ...(patch.itemsTable || {}) },
    };
    await db.query(
      `INSERT INTO company_settings(company_id, settings) VALUES($1,$2::jsonb)
       ON CONFLICT (company_id) DO UPDATE SET settings=EXCLUDED.settings` ,
      [companyId, JSON.stringify(next)]
    );
    return next;
  }

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

  // Authenticated routes
  app.use(authenticateToken);
  app.use('/', imports.router);
  app.use('/items', items.router);
  app.use('/documents', documents.router);
  app.use('/lots', lots.router);
  app.use('/sequences', sequences.router);
  app.use('/causals', causals.router);
  app.use('/', inventories.router);
  app.use('/', labels.router);
  app.use('/', storage.router);
  app.use('/', operations.router);
  app.use('/warehouses', warehousesRouter.router);
  app.use('/', locationsRouter.router);
  app.use('/transfers', transfersRouter.router);
  app.use('/logs', logsRouter.router);
  app.use('/customers', customersRouter.router);
  app.use('/suppliers', suppliersRouter.router);
  app.use('/users', usersRouter.router);

  // Dashboard reports
  app.get('/reports/dashboard', async (req, res) => {
    try {
      const { from, to, warehouse } = req.query;
      const params = [];
      const conditions = [];
      if (from) {
        params.push(from);
        conditions.push(`moved_at >= $${params.length}`);
      }
      if (to) {
        params.push(to);
        conditions.push(`moved_at <= $${params.length}`);
      }
      if (warehouse) {
        params.push(warehouse);
        conditions.push(`warehouse_id = $${params.length}`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const totalStockRes = await db.query(
        `SELECT COALESCE(SUM(quantity),0) AS total FROM stock_movements ${where}`,
        params
      );
      const underStockRes = await db.query(
        `SELECT COUNT(*) AS count FROM (
           SELECT item_id, SUM(quantity) AS qty
           FROM stock_movements ${where}
           GROUP BY item_id
           HAVING SUM(quantity) < 0
         ) s`,
        params
      );

      const orderParams = [];
      const orderConditions = ["status != 'closed'", "created_at < NOW() - INTERVAL '7 days'"];
      if (from) {
        orderParams.push(from);
        orderConditions.push(`created_at >= $${orderParams.length}`);
      }
      if (to) {
        orderParams.push(to);
        orderConditions.push(`created_at <= $${orderParams.length}`);
      }
      const overdueRes = await db.query(
        `SELECT COUNT(*) AS count FROM purchase_orders WHERE ${orderConditions.join(' AND ')}`,
        orderParams
      );

      res.json({
        kpis: {
          'Giacenza totale': Number(totalStockRes.rows[0].total),
          'Sotto scorta': Number(underStockRes.rows[0].count),
          'Ordini in ritardo': Number(overdueRes.rows[0].count),
        },
        charts: {},
      });
    } catch (err) {
      logger.error('Failed to load dashboard KPIs', err);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });

  app.get('/reports/:type', async (req, res) => {
    const { type } = req.params;
    const { date, warehouse, format } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    try {
      let rows = [];
      if (type === 'inventory') {
        const params = [];
        const conditions = [];
        if (date) {
          params.push(date);
          conditions.push(`moved_at::date = $${params.length}`);
        }
        if (warehouse) {
          params.push(warehouse);
          conditions.push(`warehouse_id = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limit, offset);
        const result = await db.query(
          `SELECT item_id, SUM(quantity) AS quantity FROM stock_movements ${where} GROUP BY item_id ORDER BY item_id LIMIT $${params.length-1} OFFSET $${params.length}`,
          params
        );
        rows = result.rows;
      } else if (type === 'sales') {
        const params = [];
        const conditions = ["type = 'sale'"];
        if (date) {
          params.push(date);
          conditions.push(`created_at::date = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limit, offset);
        const result = await db.query(
          `SELECT id, status, created_at FROM documents ${where} ORDER BY id LIMIT $${params.length-1} OFFSET $${params.length}`,
          params
        );
        rows = result.rows;
      } else {
        return res.status(400).json({ error: 'Unknown report type' });
      }

      if (format === 'pdf') {
        const doc = new PDFDocument();
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => {
          res.type('application/pdf');
          res.send(Buffer.concat(chunks));
        });
        doc.text(`Report ${type}`);
        rows.forEach((r) => doc.text(JSON.stringify(r)));
        doc.end();
        return;
      }
      if (format === 'xlsx') {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Report');
        if (rows.length) {
          ws.addRow(Object.keys(rows[0]));
          rows.forEach((r) => ws.addRow(Object.values(r)));
        }
        const buffer = await wb.xlsx.writeBuffer();
        res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
        return;
      }

      res.json({ rows });
    } catch (err) {
      logger.error('Failed to load report', err);
      res.status(500).json({ error: 'Failed to load report' });
    }
  });

  app.get('/reports/:type/views', async (req, res) => {
    const { type } = req.params;
    const result = await db.query(
      'SELECT id, name, filters FROM report_views WHERE type=$1 ORDER BY id',
      [type]
    );
    res.json(result.rows);
  });

  app.post('/reports/:type/views', async (req, res) => {
    const { type } = req.params;
    const { name, filters = {} } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    await db.query(
      'INSERT INTO report_views(type, name, filters) VALUES($1,$2,$3::jsonb)',
      [type, name, JSON.stringify(filters)]
    );
    res.status(201).json({ status: 'ok' });
  });

  app.post('/reports/:type/schedule', async (req, res) => {
    const { type } = req.params;
    const { run_at } = req.body;
    if (!run_at) return res.status(400).json({ error: 'run_at required' });
    await db.query(
      'INSERT INTO report_schedules(type, run_at) VALUES($1,$2)',
      [type, run_at]
    );
    res.status(201).json({ status: 'scheduled' });
  });

  // Alerts endpoint
  app.get('/alerts', (req, res) => {
    res.json([
      { id: 1, message: 'Sample alert' },
    ]);
  });

  // Settings APIs (per-company)
  app.get('/settings', async (req, res) => {
    const companyId = req.user.company_id;
    const s = await getCompanySettings(companyId);
    res.json(s);
  });

  app.put('/settings', async (req, res) => {
    const companyId = req.user.company_id;
    const s = await saveCompanySettings(companyId, req.body || {});
    res.json(s);
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
  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const server = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Schedule daily backups; keep a handle to stop during shutdown/tests
  const backupJob = cron.schedule('0 2 * * *', () => {
    runTenantBackups().catch((err) =>
      logger.error('Scheduled backup failed', err)
    );
  });

  // Ensure background jobs are stopped when server is closed (avoid open handles in tests)
  server.on('close', () => {
    try {
      backupJob.stop();
    } catch (_) {
      // ignore
    }
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
