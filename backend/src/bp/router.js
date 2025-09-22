"use strict";

const express = require("express");
const companyContext = require("../companyContext");
const consultants = require("./consultants");
const clients = require("./clients");
const appointments = require("./appointments");
const periods = require("./periods");
const sales = require("./sales");
const settings = require("./settings");
const leaderboard = require("./leaderboard");
const dashboard = require("./dashboard");
const commissions = require("./commissions");
const push = require("./push");

const router = express.Router();

function getCompanyId(req) {
  const store = companyContext.getStore();
  if (store && store.companyId) return store.companyId;
  const header = req.headers["x-company-id"];
  if (header && !Number.isNaN(Number(header))) return Number(header);
  return req.user?.company_id || 1;
}

function isManager(user) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  return ["super_admin", "admin", "admin_global", "manager"].includes(role);
}

function hasWritePermission(req) {
  if (isManager(req.user)) return true;
  const perms = req.user && req.user.permissions;
  if (perms && perms.bp) {
    const actions = Array.isArray(perms.bp) ? perms.bp : perms.bp['*'] || [];
    return actions.includes('write') || actions.includes('*');
  }
  return false;
}

function buildRequester(req) {
  return {
    userId: req.user?.id,
    companyId: getCompanyId(req),
    canViewAll: isManager(req.user),
    canEditAll: hasWritePermission(req)
  };
}

router.get('/consultants', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await consultants.listConsultants(companyId);
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const me = await consultants.loadConsultant(companyId, req.user.id);
    res.json(me);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/consultants/:userId', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const userId = Number(req.params.userId);
    const updated = await consultants.syncConsultant(companyId, userId, req.body || {});
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/clients', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    const items = await clients.listClients({
      companyId,
      consultantId: req.query.consultantId || (!requester.canViewAll ? requester.userId : undefined),
      search: req.query.search || null,
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0
    });
    res.json({ items, total: items.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clients', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const saved = await clients.saveClient(companyId, req.body || {});
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/clients/:id', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    await clients.deleteClient(companyId, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/customers/search', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const term = req.query.q || req.query.term || req.query.search || '';
    const limit = Number(req.query.limit) || 10;
    if (!term || String(term).trim().length < 2) {
      return res.json({ items: [] });
    }
    const items = await clients.searchCustomers(companyId, term, limit);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    if (req.query.last === '1') {
      const appointment = await appointments.getLastAppointment(companyId, requester.userId);
      return res.json({ appointment });
    }
    const rows = await appointments.listAppointments({
      companyId,
      requester,
      filters: {
        global: req.query.global === '1',
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        clientId: req.query.clientId ? String(req.query.clientId) : undefined,
          clientCustomerId: req.query.customerId ? Number(req.query.customerId) : undefined,
        from: req.query.from || undefined,
        to: req.query.to || undefined,
        limit: Number(req.query.limit) || 200,
        offset: Number(req.query.offset) || 0
      }
    });
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    const saved = await appointments.saveAppointment(companyId, requester, req.body || {});
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/appointments/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    await appointments.deleteAppointment(companyId, requester, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/periods', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await periods.listPeriods({
      companyId,
      filters: {
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        type: req.query.type,
        from: req.query.from,
        to: req.query.to,
        limit: Number(req.query.limit) || 200,
        offset: Number(req.query.offset) || 0
      }
    });
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/periods', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    const saved = await periods.savePeriod(companyId, requester, req.body || {});
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/periods/:id', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    await periods.deletePeriod(companyId, requester, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await sales.listSales({
      companyId,
      filters: {
        consultantId: req.query.consultantId ? Number(req.query.consultantId) : undefined,
        clientId: req.query.clientId ? String(req.query.clientId) : undefined,
          customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
        from: req.query.from,
        to: req.query.to,
        limit: Number(req.query.limit) || 200,
        offset: Number(req.query.offset) || 0
      }
    });
    res.json({ items: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sales', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    const saved = await sales.saveSale(companyId, requester, req.body || {});
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/sales/:id', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    await sales.deleteSale(companyId, requester, req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const value = await settings.loadSettings(companyId);
    const recipients = await settings.loadReportRecipients(companyId);
    res.json({ settings: value, recipients, vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const saved = await settings.saveSettings(companyId, req.body || {});
    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/report-recipients', async (req, res) => {
  if (!hasWritePermission(req)) return res.sendStatus(403);
  try {
    const companyId = getCompanyId(req);
    const saved = await settings.saveReportRecipients(companyId, req.body || {});
    res.json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const requester = buildRequester(req);
    const current = new Date();
    const from = new Date(current.getFullYear(), current.getMonth(), 1);
    const to = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
    const [kpis, agenda, clientsList] = await Promise.all([
      dashboard.computeKpis(companyId, requester, { currentFrom: from.toISOString().slice(0, 10), currentTo: to.toISOString().slice(0, 10) }),
      dashboard.computeAgenda(companyId, requester),
      dashboard.computeClients(companyId, requester)
    ]);
    res.json({ kpis, agenda, clients: clientsList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/commissions/summary', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) return res.status(400).json({ error: 'missing params' });
    const mode = req.query.mode === 'previsionale' ? 'previsionale' : 'consuntivo';
    const type = req.query.type || null;
    const rows = await commissions.summary(companyId, { mode, from, to, type });
    res.json({ rows });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const periodType = req.query.type || 'mensile';
    const mode = req.query.mode || 'consuntivo';
    const from = req.query.from || undefined;
    const to = req.query.to || undefined;
    const userIds = req.query.userIds ? String(req.query.userIds).split(',').map((id) => Number(id)) : undefined;
    const data = await leaderboard.buildLeaderboard({ companyId, userIds, periodType, mode, from, to });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/push/subscribe', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await push.saveSubscription(companyId, req.user.id, req.body);
    res.json({ ok: true, configured: push.isConfigured() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/push/unsubscribe', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await push.deleteSubscription(companyId, req.user.id, req.body?.endpoint);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = {
  router
};



