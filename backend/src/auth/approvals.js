const db = require('../db');
const users = require('./users');
const logger = require('../logger');

const ready = (async () => {
  // Ensure users table exists before creating FK references
  await users.ready;
  await db.query(`CREATE TABLE IF NOT EXISTS user_approvals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id),
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    resolved_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'open'
  )`);
  // Ensure there is at most one open approval per user
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS user_approvals_open_unique ON user_approvals(user_id) WHERE status='open'`
  );
})();
ready.catch((err) => {
  if (logger && logger.database && typeof logger.database.error === 'function') {
    logger.database.error('Approvals schema initialization failed', { error: err.message });
  } else {
    console.error('Approvals schema initialization failed', err);
  }
});

async function openForUser(userId, companyId) {
  await ready;
  const { rows: existing } = await db.query(
    `SELECT * FROM user_approvals WHERE user_id=$1 AND status='open'`,
    [userId]
  );
  if (existing[0]) return existing[0];
  const ins = await db.query(
    `INSERT INTO user_approvals(user_id, company_id)
     VALUES($1,$2)
     RETURNING *`,
    [userId, companyId || null]
  );
  return ins.rows[0];
}

async function resolveForUser(userId, resolverUserId) {
  await ready;
  const upd = await db.query(
    `UPDATE user_approvals
        SET status='resolved', resolved_at=now(), resolved_by=$2
      WHERE user_id=$1 AND status='open'
      RETURNING *`,
    [userId, resolverUserId || null]
  );
  return upd.rows[0] || null;
}

async function listOpen(companyId) {
  await ready;
  const { rows } = await db.query(
    `SELECT ua.*, u.email
       FROM user_approvals ua
       JOIN users u ON u.id = ua.user_id
      WHERE ua.status='open' AND ua.company_id = $1
      ORDER BY ua.created_at DESC`,
    [companyId]
  );
  return rows;
}

module.exports = { ready, openForUser, resolveForUser, listOpen };
