const bcrypt = require('bcryptjs');
const { generateMfaSecret, verifyMfaToken } = require('./mfa');
const db = require('../db');

// Ensure required tables/columns exist. We keep using the "users" table
// defined by migrations, but we add a few optional columns if missing
// (company_id is handled by migrations already).
const ready = (async () => {
  // Ensure companies exists to satisfy FK when creating users
  await db.query(`CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    warehouse_id INTEGER,
    company_id INTEGER REFERENCES companies(id)
  )`);
  // Optional fields for better UX; add if not present
  // Note: avoid PL/pgSQL DO blocks to keep compatibility with pg-mem in tests
  const columnExists = async (column) => {
    const { rows } = await db.query(
      `SELECT 1 FROM information_schema.columns
         WHERE table_name='users' AND column_name=$1`,
      [column]
    );
    return !!rows[0];
  };
  if (!(await columnExists('last_login'))) {
    await db.query('ALTER TABLE users ADD COLUMN last_login timestamptz');
  }
  if (!(await columnExists('mfa_secret'))) {
    await db.query('ALTER TABLE users ADD COLUMN mfa_secret text');
  }
  if (!(await columnExists('name'))) {
    await db.query('ALTER TABLE users ADD COLUMN name text');
  }
  if (!(await columnExists('permissions'))) {
    // store as textified json for compatibility
    await db.query('ALTER TABLE users ADD COLUMN permissions text');
  }
})();

function validatePassword(password) {
  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!complexity.test(password)) {
    throw new Error('Password does not meet complexity requirements');
  }
}

async function ensureRole(name) {
  const sel = await db.query('SELECT id FROM roles WHERE name=$1', [name]);
  if (sel.rows[0]) return sel.rows[0].id;
  const ins = await db.query('INSERT INTO roles(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING id', [name]);
  if (ins.rows[0]) return ins.rows[0].id;
  const again = await db.query('SELECT id FROM roles WHERE name=$1', [name]);
  return again.rows[0] ? again.rows[0].id : null;
}

async function createUser({
  email,
  password,
  role = 'worker',
  permissions = {}, // kept for API compatibility, not persisted directly
  mfa_secret = null,
  warehouse_id,
  company_id,
}) {
  await ready;
  const exists = await db.query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email]);
  if (exists.rowCount > 0) {
    throw new Error('User exists');
  }
  validatePassword(password);
  const password_hash = await bcrypt.hash(password, 10);
  const role_id = await ensureRole(role);
  const ins = await db.query(
    `INSERT INTO users(email, password_hash, role_id, warehouse_id, company_id, mfa_secret, permissions)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, warehouse_id, company_id, role_id, permissions` ,
    [
      email,
      password_hash,
      role_id,
      warehouse_id || null,
      company_id || null,
      mfa_secret,
      permissions && Object.keys(permissions).length ? JSON.stringify(permissions) : null,
    ]
  );
  const user = ins.rows[0];
  user.role = role; // we know the role name we inserted
  user.permissions = permissions || {};
  return user;
}

async function getUserById(id) {
  await ready;
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.password_hash, u.warehouse_id, u.company_id, u.mfa_secret, u.permissions,
            COALESCE(r.name, 'worker') AS role,
            u.last_login,
            u.name
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`, [id]
  );
  const u = rows[0];
  if (!u) return null;
  if (u.permissions) {
    try { u.permissions = JSON.parse(u.permissions); } catch { u.permissions = {}; }
  } else {
    u.permissions = {};
  }
  return u;
}

async function updateUser(id, changes) {
  await ready;
  const fields = [];
  const params = [];

  // Email change with case-insensitive uniqueness check
  if (typeof changes.email === 'string') {
    const newEmail = changes.email.trim();
    if (!newEmail) throw new Error('Email required');
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2', [newEmail, id]);
    if (exists.rowCount > 0) throw new Error('Email already in use');
    fields.push('email'); params.push(newEmail);
  }

  // Optional display name
  if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
    const nm = (changes.name == null) ? null : String(changes.name).trim();
    fields.push('name'); params.push(nm);
  }

  // Role update -> role_id
  if (typeof changes.role === 'string') {
    const roleId = await ensureRole(changes.role);
    fields.push('role_id'); params.push(roleId);
  }

  // Warehouse
  if (Object.prototype.hasOwnProperty.call(changes, 'warehouse_id')) {
    const wid = (changes.warehouse_id == null) ? null : Number(changes.warehouse_id);
    fields.push('warehouse_id'); params.push(Number.isNaN(wid) ? null : wid);
  }

  // Company change
  if (Object.prototype.hasOwnProperty.call(changes, 'company_id')) {
    const cid = (changes.company_id == null) ? null : Number(changes.company_id);
    if (cid != null) {
      const { rows } = await db.query('SELECT id FROM companies WHERE id=$1', [cid]);
      if (!rows[0]) throw new Error('Company not found');
    }
    fields.push('company_id'); params.push(Number.isNaN(cid) ? null : cid);
  }

  // Password -> password_hash
  if (typeof changes.password === 'string' && changes.password.length > 0) {
    validatePassword(changes.password);
    const hash = await bcrypt.hash(changes.password, 10);
    fields.push('password_hash'); params.push(hash);
  }

  if (fields.length === 0) {
    const current = await getUserById(id);
    if (!current) throw new Error('User not found');
    return current;
  }

  const setClauses = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  params.push(id);
  await db.query(`UPDATE users SET ${setClauses} WHERE id=$${params.length}`, params);
  const updated = await getUserById(id);
  if (!updated) throw new Error('User not found');
  return updated;
}

async function enableMfa(id) {
  await ready;
  const secret = generateMfaSecret();
  await db.query('UPDATE users SET mfa_secret=$1 WHERE id=$2', [secret, id]);
  return secret;
}

async function disableMfa(id) {
  await ready;
  await db.query('UPDATE users SET mfa_secret=NULL WHERE id=$1', [id]);
}

async function authenticate({ email, password, mfaToken }) {
  await ready;
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.password_hash, u.warehouse_id, u.company_id, u.mfa_secret, u.permissions,
            COALESCE(r.name, 'worker') AS role,
            u.last_login
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE lower(u.email) = lower($1)` ,
    [email]
  );
  const user = rows[0];
  if (!user) return null;
  if (user.permissions) {
    try { user.permissions = JSON.parse(user.permissions); } catch { user.permissions = {}; }
  } else {
    user.permissions = {};
  }
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
  ready,
  createUser,
  authenticate,
  enableMfa,
  disableMfa,
  getUserById,
  updateUser,
};
