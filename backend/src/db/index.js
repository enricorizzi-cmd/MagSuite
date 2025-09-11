const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const companyContext = require('../companyContext');

let pool;
const usePgMem = process.env.USE_PG_MEM === 'true';

// Track session-specific settings when using pg-mem
const sessionContext = new AsyncLocalStorage();
const settings = new Map();

if (usePgMem) {
  const { newDb } = require('pg-mem');
  const mem = newDb({ noAstCoverageCheck: true });
  const pg = mem.getSchema('pg_catalog');
  pg.registerFunction({
    name: 'set_config',
    args: ['text', 'text', 'boolean'],
    returns: 'text',
    impure: true,
    implementation: (key, value) => {
      const id = sessionContext.getStore();
      let map = settings.get(id);
      if (!map) {
        map = new Map();
        settings.set(id, map);
      }
      map.set(key, value);
      return value;
    },
  });
  pg.registerFunction({
    name: 'current_setting',
    args: ['text'],
    returns: 'text',
    impure: true,
    implementation: (key) => {
      const id = sessionContext.getStore();
      const map = settings.get(id);
      return (map && map.get(key)) || null;
    },
  });
  pg.registerFunction({
    name: 'current_setting',
    args: ['text', 'boolean'],
    returns: 'text',
    impure: true,
    implementation: (key, missing_ok) => {
      const id = sessionContext.getStore();
      const map = settings.get(id);
      const val = (map && map.get(key)) || null;
      if (val == null && !missing_ok) {
        throw new Error(`unrecognized configuration parameter "${key}"`);
      }
      return val;
    },
  });
  mem.public.none(
    "CREATE TABLE companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)"
  );
  mem.public.none(
    "INSERT INTO companies(id, name) VALUES (1,'A'), (2,'B')"
  );
  const { Pool } = mem.adapters.createPg();
  pool = new Pool();
} else {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL;
  const caPath = process.env.DB_CA_PATH || '/etc/secrets/supabase-ca.crt';

  let ca;
  try {
    ca = fs.readFileSync(caPath, 'utf8');
  } catch (err) {
    // Fall back to default trust store if custom CA is not available
  }

  const baseConfig = connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      };

  const useSSL = process.env.PGSSLMODE !== 'disable';

  pool = new Pool({
    ...baseConfig,
    ssl: useSSL ? { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' } : false,
    enableChannelBinding: useSSL,
  });

  pool.query('SELECT 1').catch((err) => {
    console.error('Database connection failed', err);
  });
}

async function query(text, params) {
  const store = companyContext.getStore();
  const companyId = store && store.companyId;
  const sessionId = Symbol('session');
  const client = await pool.connect();
  try {
    return await sessionContext.run(sessionId, async () => {
      try {
        let cid = companyId;
        // Fallback only when no request context is present (store is null) during tests
        if (!store && usePgMem && !cid) {
          cid = process.env.DEFAULT_COMPANY_ID || 1;
        }
        if (cid) {
          await client.query('select set_config($1, $2, true)', [
            'app.current_company_id',
            String(cid),
          ]);
        }
        return await client.query(text, params);
      } finally {
        if (usePgMem) {
          settings.delete(sessionId);
        }
      }
    });
  } finally {
    client.release();
  }
}

module.exports = { query, connect: () => pool.connect() };

