const { verifyAccessToken, verifySsoToken } = require('./tokens');
const companyContext = require('../companyContext');
const db = require('../db');
require('../companies');

// Expanded role map to support new roles while preserving compatibility
const rolePermissions = {
  // New roles
  super_admin: { '*': ['*'] },
  admin: { '*': ['*'] },
  standard: {
    inventory: ['read'],
    documents: ['read'],
    items: ['read'],
    gestionale: ['read'],
  },
  view: {
    inventory: ['read'],
    documents: ['read'],
    items: ['read'],
    gestionale: ['read'],
  },
  // Backward compatible legacy roles
  manager: {
    inventory: ['read', 'write'],
    orders: ['read'],
    documents: ['read', 'write'],
    items: ['read', 'write'],
    gestionale: ['read'],
  },
  worker: { inventory: ['read'], items: ['read'] },
  api: { '*': ['*'] },
};

async function ensureCompanyAccessOrBlock(user, companyId) {
  if (!companyId) return;
  if (user && (user.role === 'super_admin' || user.role === 'admin_global')) return;
  const { rows } = await db.query('SELECT suspended FROM companies WHERE id=$1', [companyId]);
  if (rows[0] && rows[0].suspended) {
    const err = new Error('Company suspended');
    err.status = 403;
    throw err;
  }
}

function authenticateToken(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY) {
    const companyIdHeader = req.headers['x-company-id'];
    const companyId = Number(companyIdHeader);
    if (!companyIdHeader || Number.isNaN(companyId)) {
      return res.status(400).json({ error: 'x-company-id header required' });
    }
    req.user = { role: 'api', company_id: companyId };
    return (async () => {
      try {
        await ensureCompanyAccessOrBlock(req.user, companyId);
        companyContext.run({ companyId: req.user.company_id }, next);
      } catch (e) {
        res.sendStatus(e.status || 403);
      }
    })();
  }

  const sso = req.headers['x-sso-token'];
  if (sso) {
    try {
      req.user = verifySsoToken(sso);
      return (async () => {
        try {
          await ensureCompanyAccessOrBlock(req.user, req.user.company_id);
          companyContext.run({ companyId: req.user.company_id }, next);
        } catch (e) {
          res.sendStatus(e.status || 401);
        }
      })();
    } catch {
      return res.sendStatus(401);
    }
  }

  const header = req.headers['authorization'];
  let token = header && header.split(' ')[1];
  if (!token && req.query && req.query.access_token) {
    token = String(req.query.access_token);
  }
  if (!token) return res.sendStatus(401);
  try {
    req.user = verifyAccessToken(token);
    // Allow super_admin to override company context via header
    const headerCompany = req.headers['x-company-id'] || (req.query && req.query.company_id);
    let companyId = req.user.company_id;
    if (
      headerCompany &&
      (req.user.role === 'super_admin' || req.user.role === 'admin_global') &&
      !Number.isNaN(Number(headerCompany))
    ) {
      companyId = Number(headerCompany);
    }
    (async () => {
      try {
        await ensureCompanyAccessOrBlock(req.user, companyId);
        companyContext.run({ companyId }, next);
      } catch (e) {
        res.sendStatus(e.status || 401);
      }
    })();
  } catch {
    return res.sendStatus(401);
  }
}

function resolvePermissions(user) {
  if (user.permissions && Object.keys(user.permissions).length) {
    return user.permissions;
  }
  return rolePermissions[user.role] || {};
}

function rbac(module, action) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.sendStatus(401);
    const perms = resolvePermissions(user);
    const actions = perms[module] || perms['*'] || [];
    if (!actions.includes(action) && !actions.includes('*')) {
      return res.sendStatus(403);
    }
    if (
      user.warehouse_id &&
      req.params.warehouse_id &&
      Number(req.params.warehouse_id) !== Number(user.warehouse_id)
    ) {
      return res.sendStatus(403);
    }
    next();
  };
}

module.exports = { authenticateToken, rbac };
