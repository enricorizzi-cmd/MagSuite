const db = require('./db');
const audit = require('./audit');
const logger = require('./logger');

// Ensure companies table and required columns/indexes exist
const ready = (async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )`
  );
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies (lower(name))`
  );
  await db.query(
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false`
  );
})();
ready.catch((err) => {
  if (logger && logger.database && typeof logger.database.error === 'function') {
    logger.database.error('Companies schema initialization failed', { error: err.message });
  } else {
    console.error('Companies schema initialization failed', err);
  }
});

function safeIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error('Invalid identifier');
  }
  return name;
}

async function getCompany(id) {
  await ready;
  const { rows } = await db.query('SELECT id, name, suspended FROM companies WHERE id=$1', [id]);
  return rows[0] || null;
}

async function setSuspended(id, suspended, actorUserId) {
  await ready;
  const { rowCount } = await db.query('UPDATE companies SET suspended=$2 WHERE id=$1', [id, !!suspended]);
  if (rowCount === 0) throw new Error('Company not found');
  audit.logAction(actorUserId, suspended ? 'suspend_company' : 'unsuspend_company', { company_id: id });
  return { id, suspended: !!suspended };
}

async function deleteCompanyAndData(id, actorUserId) {
  await ready;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Collect all public tables that have a company_id column
    const { rows: tables } = await client.query(
      `SELECT table_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'company_id'`
    );
    const tableNames = tables
      .map((r) => r.table_name)
      .filter((t) => t !== 'companies');

    // Build FK dependency graph among those tables (child -> parent)
    const { rows: fks } = await client.query(
      `SELECT tc.table_name AS child, ccu.table_name AS parent
         FROM information_schema.table_constraints AS tc
         JOIN information_schema.key_column_usage AS kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
         JOIN information_schema.constraint_column_usage AS ccu
           ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_schema = 'public'`
    );
    const setNames = new Set(tableNames);
    const edges = fks
      .filter((r) => setNames.has(r.child) && setNames.has(r.parent))
      .map((r) => ({ child: r.child, parent: r.parent }));

    // Topological sort with edges child -> parent; delete in that order
    const adj = new Map();
    const indeg = new Map();
    for (const t of tableNames) {
      adj.set(t, []);
      indeg.set(t, 0);
    }
    for (const { child, parent } of edges) {
      adj.get(child).push(parent);
      indeg.set(parent, (indeg.get(parent) || 0) + 1);
    }
    const queue = [];
    for (const [t, d] of indeg.entries()) {
      if (d === 0) queue.push(t);
    }
    const ordered = [];
    while (queue.length) {
      const n = queue.shift();
      ordered.push(n);
      for (const m of adj.get(n)) {
        indeg.set(m, indeg.get(m) - 1);
        if (indeg.get(m) === 0) queue.push(m);
      }
    }
    // Fallback: if cycle (unlikely), just use the list as-is
    const deletionOrder = ordered.length === tableNames.length ? ordered : tableNames;

    // Execute deletions
    for (const t of deletionOrder) {
      const table = safeIdent(t);
      await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [id]);
    }

    // Finally remove the company row itself
    await client.query('DELETE FROM companies WHERE id=$1', [id]);
    await client.query('COMMIT');
    audit.logAction(actorUserId, 'delete_company', { company_id: id, tables: deletionOrder });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { ready, getCompany, setSuspended, deleteCompanyAndData };

