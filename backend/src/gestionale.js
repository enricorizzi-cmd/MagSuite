const express = require('express');
const db = require('./db');
const { rbac } = require('./auth');
const logger = require('./logger');

const router = express.Router();

function companyIdFrom(req) {
  const header = req.headers['x-company-id'];
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePagination(req, defaultLimit = 20, maxLimit = 100) {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || defaultLimit, maxLimit);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

async function ensureTables() {
  try {
    await db.query(CREATE TABLE IF NOT EXISTS gestion_orders (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      order_date DATE NOT NULL,
      customer_name TEXT NOT NULL,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending'
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_order_deliveries (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      order_id INTEGER REFERENCES gestion_orders(id) ON DELETE CASCADE,
      delivery_date DATE NOT NULL,
      quantity NUMERIC(12,2) DEFAULT 0,
      notes TEXT
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_contacts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      type TEXT
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_byproducts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT,
      price NUMERIC(12,2) DEFAULT 0
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_commissions (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      agent_id INTEGER,
      order_id INTEGER REFERENCES gestion_orders(id) ON DELETE SET NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      rate NUMERIC(5,2) DEFAULT 0,
      period TEXT
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_targets (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      entity TEXT NOT NULL,
      period TEXT NOT NULL,
      metric TEXT NOT NULL,
      target_value NUMERIC(12,2) DEFAULT 0,
      actual_value NUMERIC(12,2) DEFAULT 0
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_marketing_clients (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      name TEXT NOT NULL,
      source TEXT,
      campaign TEXT,
      created_at TIMESTAMP DEFAULT now()
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_games (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      starts_at TIMESTAMP
    ));
    await db.query(CREATE TABLE IF NOT EXISTS gestion_profiles (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      full_name TEXT NOT NULL,
      locale TEXT DEFAULT 'it',
      created_at TIMESTAMP DEFAULT now()
    ));
  } catch (error) {
    logger.error('Failed to ensure gestionale tables', { error: error.message });
    throw error;
  }
}

async function seedDemoData(companyId = 1) {
  const { rows: orderCountRows } = await db.query('SELECT COUNT(*) FROM gestion_orders WHERE company_id = ', [companyId]);
  const hasOrders = Number(orderCountRows[0]?.count || 0) > 0;
  if (!hasOrders) {
    const ordersSeed = [
      { order_date: '2024-05-02', customer_name: 'Edilizia Firenze Srl', total: 18450.0, status: 'pending' },
      { order_date: '2024-05-05', customer_name: 'Gruppo Mercurio', total: 9230.5, status: 'in_progress' },
      { order_date: '2024-05-08', customer_name: 'Techno Retail Spa', total: 15290.9, status: 'completed' },
      { order_date: '2024-05-09', customer_name: 'LogiTrans Europa', total: 4870.0, status: 'backlog' },
      { order_date: '2024-05-11', customer_name: 'Studio Beta Consulting', total: 3150.0, status: 'pending' }
    ];
    const insertedOrders = [];
    for (const row of ordersSeed) {
      const { rows } = await db.query(
        'INSERT INTO gestion_orders (company_id, order_date, customer_name, total, status) VALUES (,,,,) RETURNING id, status, customer_name',
        [companyId, row.order_date, row.customer_name, row.total, row.status]
      );
      insertedOrders.push(rows[0]);
    }
    const deliveriesSeed = [
      { customer_name: 'Edilizia Firenze Srl', delivery_date: '2024-05-06', quantity: 24, notes: 'Prima tranche materiali carpenteria' },
      { customer_name: 'Gruppo Mercurio', delivery_date: '2024-05-07', quantity: 12, notes: 'Kit allestimento punti vendita' },
      { customer_name: 'Techno Retail Spa', delivery_date: '2024-05-10', quantity: 30, notes: 'Rollout completo apparati' }
    ];
    for (const delivery of deliveriesSeed) {
      const orderMatch = insertedOrders.find((o) => o.customer_name === delivery.customer_name);
      if (!orderMatch) continue;
      await db.query(
        'INSERT INTO gestion_order_deliveries (company_id, order_id, delivery_date, quantity, notes) VALUES (,,,,)',
        [companyId, orderMatch.id, delivery.delivery_date, delivery.quantity, delivery.notes]
      );
    }
    const commissionsSeed = [
      { agent_id: 12, customer_name: 'Edilizia Firenze Srl', amount: 923.0, rate: 5.0, period: '2024-Q2' },
      { agent_id: 8, customer_name: 'Gruppo Mercurio', amount: 554.0, rate: 6.0, period: '2024-Q2' },
      { agent_id: 4, customer_name: 'Techno Retail Spa', amount: 764.5, rate: 5.0, period: '2024-Q2' }
    ];
    for (const commission of commissionsSeed) {
      const orderMatch = insertedOrders.find((o) => o.customer_name === commission.customer_name);
      await db.query(
        'INSERT INTO gestion_commissions (company_id, agent_id, order_id, amount, rate, period) VALUES (,,,,,)',
        [companyId, commission.agent_id, orderMatch ? orderMatch.id : null, commission.amount, commission.rate, commission.period]
      );
    }
  }

  const { rows: contactsCountRows } = await db.query('SELECT COUNT(*) FROM gestion_contacts WHERE company_id = ', [companyId]);
  if (Number(contactsCountRows[0]?.count || 0) === 0) {
    const contactsSeed = [
      { name: 'Francesca Leoni', email: 'f.leoni@edilziafirenze.it', phone: '+39 055 1234567', type: 'Buyer' },
      { name: 'Andrea Rizzi', email: 'andrea.rizzi@gruppomercurio.eu', phone: '+39 02 9876543', type: 'Direttore acquisti' },
      { name: 'Laura Venturi', email: 'laura.venturi@technoretail.it', phone: '+39 06 7654321', type: 'IT Procurement' },
      { name: 'Paolo Santini', email: 'p.santini@logitrans.eu', phone: '+39 051 4567890', type: 'Operations Manager' }
    ];
    for (const row of contactsSeed) {
      await db.query(
        'INSERT INTO gestion_contacts (company_id, name, email, phone, type) VALUES (,,,,)',
        [companyId, row.name, row.email, row.phone, row.type]
      );
    }
  }

  const { rows: byproductsCountRows } = await db.query('SELECT COUNT(*) FROM gestion_byproducts WHERE company_id = ', [companyId]);
  if (Number(byproductsCountRows[0]?.count || 0) === 0) {
    const byproductsSeed = [
      { code: 'BP-001', name: 'Moduli espositivi', unit: 'pz', price: 180.0 },
      { code: 'BP-002', name: 'Kit comunicazione retail', unit: 'set', price: 95.5 },
      { code: 'BP-003', name: 'Accessori manutenzione', unit: 'kit', price: 65.0 }
    ];
    for (const row of byproductsSeed) {
      await db.query(
        'INSERT INTO gestion_byproducts (company_id, code, name, unit, price) VALUES (,,,,)',
        [companyId, row.code, row.name, row.unit, row.price]
      );
    }
  }

  const { rows: targetsCountRows } = await db.query('SELECT COUNT(*) FROM gestion_targets WHERE company_id = ', [companyId]);
  if (Number(targetsCountRows[0]?.count || 0) === 0) {
    const targetsSeed = [
      { entity: 'Direzione commerciale', period: '2024-Q2', metric: 'Fatturato', target_value: 600000, actual_value: 420000 },
      { entity: 'Direzione commerciale', period: '2024-Q2', metric: 'Nuovi clienti', target_value: 25, actual_value: 18 },
      { entity: 'Marketing', period: '2024-Q2', metric: 'Lead qualificati', target_value: 180, actual_value: 132 }
    ];
    for (const row of targetsSeed) {
      await db.query(
        'INSERT INTO gestion_targets (company_id, entity, period, metric, target_value, actual_value) VALUES (,,,,,)',
        [companyId, row.entity, row.period, row.metric, row.target_value, row.actual_value]
      );
    }
  }

  const { rows: marketingCountRows } = await db.query('SELECT COUNT(*) FROM gestion_marketing_clients WHERE company_id = ', [companyId]);
  if (Number(marketingCountRows[0]?.count || 0) === 0) {
    const marketingSeed = [
      { name: 'Florence Retail Hub', source: 'Fiera Pitti 2024', campaign: 'Allestimenti In-Store', created_at: '2024-05-01T09:00:00Z' },
      { name: 'LineaVerde Coop', source: 'Referenza Cliente', campaign: 'Refit Freschi', created_at: '2024-05-04T15:30:00Z' },
      { name: 'Mobilia 360', source: 'Campagna LinkedIn', campaign: 'Retail Experience', created_at: '2024-05-06T11:45:00Z' }
    ];
    for (const row of marketingSeed) {
      await db.query(
        'INSERT INTO gestion_marketing_clients (company_id, name, source, campaign, created_at) VALUES (,,,,)',
        [companyId, row.name, row.source, row.campaign, row.created_at]
      );
    }
  }

  const { rows: gamesCountRows } = await db.query('SELECT COUNT(*) FROM gestion_games WHERE company_id = ', [companyId]);
  if (Number(gamesCountRows[0]?.count || 0) === 0) {
    const gamesSeed = [
      { name: 'PlayRetail Experience', status: 'running', starts_at: '2024-05-02T08:00:00Z' },
      { name: 'Promo Sprint Academy', status: 'planning', starts_at: '2024-05-12T09:30:00Z' },
      { name: 'Sales Gamification Sprint', status: 'completed', starts_at: '2024-04-15T10:00:00Z' }
    ];
    for (const row of gamesSeed) {
      await db.query(
        'INSERT INTO gestion_games (company_id, name, status, starts_at) VALUES (,,,)',
        [companyId, row.name, row.status, row.starts_at]
      );
    }
  }

  const { rows: profilesCountRows } = await db.query('SELECT COUNT(*) FROM gestion_profiles WHERE company_id = ', [companyId]);
  if (Number(profilesCountRows[0]?.count || 0) === 0) {
    const profilesSeed = [
      { full_name: 'Marta Bianchi', locale: 'it', created_at: '2024-04-01T07:45:00Z' },
      { full_name: 'James Roberts', locale: 'en', created_at: '2024-03-18T10:20:00Z' },
      { full_name: 'Giulia Ferrero', locale: 'it', created_at: '2024-05-05T16:00:00Z' }
    ];
    for (const row of profilesSeed) {
      await db.query(
        'INSERT INTO gestion_profiles (company_id, full_name, locale, created_at) VALUES (,,,)',
        [companyId, row.full_name, row.locale, row.created_at]
      );
    }
  }
}

(async () => {
  await ensureTables();
  await seedDemoData(1);
})().catch((error) => {
  logger.error('Gestionale initialization failed', { error: error.message });
});

router.get('/summary', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  try {
    const [{ rows: totalRows }, { rows: backlogRows }, { rows: upcomingRows }] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total_orders, COALESCE(SUM(total),0)::float AS total_revenue FROM gestion_orders WHERE company_id=', [companyId]),
      db.query("SELECT COALESCE(SUM(total),0)::float AS backlog_value FROM gestion_orders WHERE company_id= AND status IN ('pending','backlog')", [companyId]),
      db.query(
        SELECT od.id, o.customer_name, od.delivery_date
        FROM gestion_order_deliveries od
        JOIN gestion_orders o ON o.id = od.order_id
        WHERE od.company_id=
        ORDER BY od.delivery_date ASC
        LIMIT 3
      , [companyId])
    ]);
    res.json({
      total_orders: totalRows[0]?.total_orders || 0,
      total_revenue: totalRows[0]?.total_revenue || 0,
      backlog_value: backlogRows[0]?.backlog_value || 0,
      upcoming_deliveries: upcomingRows.map((row) => ({
        id: row.id,
        customer_name: row.customer_name,
        delivery_date: row.delivery_date
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento riepilogo' });
  }
});

router.get('/orders', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  const { limit, page, offset } = parsePagination(req);
  const status = req.query.status && String(req.query.status).trim();
  const params = [companyId];
  let whereClause = 'company_id = ';
  if (status) {
    params.push(status);
    whereClause +=  AND status = {params.length};
  }
  try {
    const itemsPromise = db.query(
      SELECT id, order_date, customer_name, total, status
       FROM gestion_orders
       WHERE 
       ORDER BY order_date DESC
       LIMIT {params.length + 1} OFFSET {params.length + 2},
      [...params, limit, offset]
    );
    const totalPromise = db.query(SELECT COUNT(*) FROM gestion_orders WHERE , params);
    const [itemsRes, totalRes] = await Promise.all([itemsPromise, totalPromise]);
    res.json({
      items: itemsRes.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento ordini' });
  }
});

router.get('/deliveries', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  const { limit, page, offset } = parsePagination(req);
  try {
    const [itemsRes, totalRes] = await Promise.all([
      db.query(
        SELECT od.id, od.order_id, o.customer_name, od.delivery_date, od.quantity, od.notes
        FROM gestion_order_deliveries od
        JOIN gestion_orders o ON o.id = od.order_id
        WHERE od.company_id = 
        ORDER BY od.delivery_date DESC
        LIMIT  OFFSET 
      , [companyId, limit, offset]),
      db.query('SELECT COUNT(*) FROM gestion_order_deliveries WHERE company_id = ', [companyId])
    ]);
    res.json({
      items: itemsRes.rows.map((row) => ({
        id: row.id,
        order_id: row.order_id,
        customer_name: row.customer_name,
        date: row.delivery_date,
        quantity: row.quantity,
        notes: row.notes
      })),
      total: Number(totalRes.rows[0]?.count || 0),
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento erogazioni' });
  }
});

router.get('/contacts', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  const { limit, page, offset } = parsePagination(req);
  try {
    const [itemsRes, totalRes] = await Promise.all([
      db.query(
        SELECT id, name, email, phone, type
         FROM gestion_contacts
         WHERE company_id = 
         ORDER BY name
         LIMIT  OFFSET ,
        [companyId, limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM gestion_contacts WHERE company_id = ', [companyId])
    ]);
    res.json({
      items: itemsRes.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento contatti' });
  }
});

router.get('/byproducts', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  try {
    const { rows } = await db.query(
      SELECT id, code, name, unit, price
       FROM gestion_byproducts
       WHERE company_id = 
       ORDER BY code,
      [companyId]
    );
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento sottoprodotti' });
  }
});

router.get('/commissions', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  const { limit, page, offset } = parsePagination(req);
  try {
    const [itemsRes, totalRes] = await Promise.all([
      db.query(
        SELECT id, agent_id, order_id, amount, rate, period
         FROM gestion_commissions
         WHERE company_id = 
         ORDER BY period DESC, id DESC
         LIMIT  OFFSET ,
        [companyId, limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM gestion_commissions WHERE company_id = ', [companyId])
    ]);
    res.json({
      items: itemsRes.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento provvigioni' });
  }
});

router.get('/targets', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  try {
    const { rows } = await db.query(
      SELECT id, entity, period, metric, target_value, actual_value
       FROM gestion_targets
       WHERE company_id = 
       ORDER BY period DESC, entity,
      [companyId]
    );
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento target' });
  }
});

router.get('/marketing-clients', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  const { limit, page, offset } = parsePagination(req);
  try {
    const [itemsRes, totalRes] = await Promise.all([
      db.query(
        SELECT id, name, source, campaign, created_at
         FROM gestion_marketing_clients
         WHERE company_id = 
         ORDER BY created_at DESC
         LIMIT  OFFSET ,
        [companyId, limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM gestion_marketing_clients WHERE company_id = ', [companyId])
    ]);
    res.json({
      items: itemsRes.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento marketing' });
  }
});

router.get('/games', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  try {
    const { rows } = await db.query(
      SELECT id, name, status, starts_at
       FROM gestion_games
       WHERE company_id = 
       ORDER BY starts_at DESC,
      [companyId]
    );
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento giochi' });
  }
});

router.get('/profiles', rbac('gestionale', 'read'), async (req, res) => {
  const companyId = companyIdFrom(req);
  try {
    const { rows } = await db.query(
      SELECT id, full_name, locale, created_at
       FROM gestion_profiles
       WHERE company_id = 
       ORDER BY created_at DESC,
      [companyId]
    );
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Errore caricamento profili' });
  }
});

module.exports = { router };
