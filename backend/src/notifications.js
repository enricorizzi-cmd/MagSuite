const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth/middleware');
const events = require('./events');

// In-memory client registry per company
const clients = new Map(); // companyId -> Set(res)

function addClient(companyId, res) {
  const key = String(companyId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
}

function removeClient(companyId, res) {
  const key = String(companyId);
  if (clients.has(key)) {
    clients.get(key).delete(res);
    if (clients.get(key).size === 0) clients.delete(key);
  }
}

// Broadcast helper (company-scoped)
function notify(companyId, payload) {
  const key = String(companyId);
  const set = clients.get(key);
  if (!set) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    res.write(data);
  }
}

// Re-broadcast selected internal events if emitted
events.on('notification', (companyId, payload) => notify(companyId, payload));

// SSE stream for notifications
router.get('/stream', authenticateToken, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // company context is set by middleware; fetch from current setting via header param if super_admin used x-company-id
  const companyId = req.user.company_id || req.headers['x-company-id'];
  const cid = Number(companyId);
  if (!cid || Number.isNaN(cid)) {
    // Try to read current setting fallback by pushing a heartbeat only
  }

  // Heartbeat every 25s
  const heartbeat = setInterval(() => {
    res.write('event: ping\n');
    res.write(`data: ${Date.now()}\n\n`);
  }, 25000);

  // Register client
  if (!Number.isNaN(cid) && cid) addClient(cid, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    if (!Number.isNaN(cid) && cid) removeClient(cid, res);
    res.end();
  });
});

// Simple endpoint to send a test notification (admin only)
router.post('/test', authenticateToken, (req, res) => {
  const role = req.user.role;
  if (!['admin', 'super_admin'].includes(role)) return res.sendStatus(403);
  const companyId = req.user.company_id || Number(req.headers['x-company-id']);
  const payload = {
    title: 'Notifica di test',
    body: 'Questa è una notifica di prova',
    time: new Date().toISOString(),
  };
  notify(companyId, payload);
  res.json({ ok: true });
});

module.exports = { router, notify };

