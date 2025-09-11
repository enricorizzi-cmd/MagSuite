const cron = require('node-cron');
const db = require('../db');
const events = require('../events');

// Simple registry-based plugin system for future ERP integrations
// Each connector plugin should export hooks for push/pull operations.

const plugins = new Map(); // type -> plugin module
const schedules = new Map(); // connector_id -> cron task

function registerPlugin(type, plugin) {
  plugins.set(type, plugin);
}

async function loadConnectors() {
  const { rows } = await db.query(`SELECT id, company_id, type, name, config, enabled, schedule FROM connectors WHERE enabled = true`);
  return rows;
}

function startSchedule(connector, plugin) {
  if (!connector.schedule || !plugin.pull) return;
  try {
    const task = cron.schedule(connector.schedule, async () => {
      await runJob(connector, 'pull', 'scheduled');
    });
    schedules.set(connector.id, task);
  } catch (e) {
    // invalid cron expression; ignore
  }
}

async function runJob(connector, direction, event = null, payload = null) {
  const plugin = plugins.get(connector.type);
  if (!plugin) return;
  const { rows } = await db.query(
    `INSERT INTO connector_jobs(connector_id, direction, event, status) VALUES($1,$2,$3,'running') RETURNING id`,
    [connector.id, direction, event]
  );
  const jobId = rows[0].id;
  let status = 'ok';
  let log = '';
  try {
    if (direction === 'pull' && plugin.pull) {
      await plugin.pull(connector, payload);
    } else if (direction === 'push' && plugin.push) {
      await plugin.push(connector, event, payload);
    }
  } catch (e) {
    status = 'error';
    log = String(e && e.stack || e);
  } finally {
    await db.query(`UPDATE connector_jobs SET status=$1, finished_at=now(), log=$2 WHERE id=$3`, [status, log, jobId]);
  }
}

async function routeEventToConnectors(eventName, payload, companyId) {
  const { rows } = await db.query(`SELECT * FROM connectors WHERE enabled = true AND company_id = $1`, [companyId]);
  for (const c of rows) {
    const plugin = plugins.get(c.type);
    if (plugin && plugin.push) {
      await runJob(c, 'push', eventName, payload);
    }
  }
}

async function initIntegrations(app) {
  // dynamic plugin discovery placeholder; can require from ./vendors later
  // Example: registerPlugin('acme_erp', require('./vendors/acme'));

  // Webhook endpoint (per-connector)
  app.post('/integrations/:connectorId/webhook', async (req, res) => {
    const id = Number(req.params.connectorId);
    const { rows } = await db.query(`SELECT * FROM connectors WHERE id=$1 AND enabled=true`, [id]);
    if (!rows[0]) return res.sendStatus(404);
    const connector = rows[0];
    const plugin = plugins.get(connector.type);
    if (!plugin || !plugin.webhook) return res.sendStatus(404);
    try {
      await plugin.webhook(connector, req.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'webhook_failed' });
    }
  });

  // Subscribe to domain events to push out changes
  const companyAwareEvents = [
    'items.created', 'items.updated', 'receiving.created', 'price_list.updated'
  ];
  for (const ev of companyAwareEvents) {
    events.on(ev, async (companyId, payload) => {
      await routeEventToConnectors(ev, payload, companyId);
    });
  }

  // Load connectors and start schedules
  const connectors = await loadConnectors();
  for (const c of connectors) {
    const plugin = plugins.get(c.type);
    if (plugin) startSchedule(c, plugin);
  }
}

module.exports = { initIntegrations, registerPlugin };

