const { verifyAccessToken, verifySsoToken } = require('./tokens');
const companyContext = require('../companyContext');

const rolePermissions = {
  admin: { '*': ['*'] },
  manager: {
    inventory: ['read', 'write'],
    orders: ['read'],
    documents: ['read', 'write'],
    items: ['read', 'write'],
  },
  worker: { inventory: ['read'], items: ['read'] },
  api: { '*': ['*'] },
};

function authenticateToken(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && process.env.API_KEY && apiKey === process.env.API_KEY) {
    req.user = { role: 'api', company_id: Number(req.headers['x-company-id']) };
    return companyContext.run({ companyId: req.user.company_id }, next);
  }

  const sso = req.headers['x-sso-token'];
  if (sso) {
    try {
      req.user = verifySsoToken(sso);
      return companyContext.run({ companyId: req.user.company_id }, next);
    } catch {
      return res.sendStatus(401);
    }
  }

  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = verifyAccessToken(token);
    companyContext.run({ companyId: req.user.company_id }, next);
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
