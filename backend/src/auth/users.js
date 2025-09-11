const bcrypt = require('bcryptjs');
const { generateMfaSecret, verifyMfaToken } = require('./mfa');

const users = [];
let idSeq = 1;

function validatePassword(password) {
  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!complexity.test(password)) {
    throw new Error('Password does not meet complexity requirements');
  }
}

async function createUser({
  email,
  password,
  role = 'worker',
  permissions = {},
  mfa_secret = null,
  warehouse_id,
  company_id,
}) {
  if (users.find((u) => u.email === email)) {
    throw new Error('User exists');
  }
  validatePassword(password);
  const password_hash = await bcrypt.hash(password, 10);
  const user = {
    id: idSeq++,
    email,
    password_hash,
    role,
    permissions,
    mfa_secret,
    warehouse_id,
    company_id,
  };
  users.push(user);
  // Promote first and only user to super_admin
  if (users.length === 1) {
    user.role = 'super_admin';
  }
  return user;
}

function getUserById(id) {
  return users.find((u) => u.id === id);
}

function enableMfa(id) {
  const user = getUserById(id);
  if (!user) throw new Error('User not found');
  user.mfa_secret = generateMfaSecret();
  return user.mfa_secret;
}

function disableMfa(id) {
  const user = getUserById(id);
  if (user) user.mfa_secret = null;
}

async function authenticate({ email, password, mfaToken }) {
  const user = users.find((u) => u.email === email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  if (user.mfa_secret) {
    if (!mfaToken || !verifyMfaToken(user.mfa_secret, mfaToken)) {
      return null;
    }
  }
  return user;
}

module.exports = {
  createUser,
  authenticate,
  enableMfa,
  disableMfa,
  // internal state helpers for maintenance
  _internal: {
    get count() { return users.length; },
    list: () => users.slice(),
    setRole: (id, role) => { const u = users.find(x=>x.id===id); if (u) u.role = role; return u; },
  }
};
