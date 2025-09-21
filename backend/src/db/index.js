const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const companyContext = require('../companyContext');
const logger = require('../logger');

let pool;
const usePgMem = process.env.USE_PG_MEM === 'true';

// Track session-specific settings when using pg-mem
const sessionContext = new AsyncLocalStorage();
const settings = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const defaultConnectRetries = parsePositiveInt(process.env.PG_CONNECT_RETRIES, 5);
const baseConnectDelayMs = parsePositiveInt(process.env.PG_CONNECT_BASE_DELAY_MS, 250);
const maxConnectDelayMs = Math.max(baseConnectDelayMs, parsePositiveInt(process.env.PG_CONNECT_MAX_DELAY_MS, 5000));
const transientErrorCodes = ['ETIMEDOUT','ECONNRESET','ECONNREFUSED','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH','ECONNABORTED'];
const transientErrorMessages = [
  'Connection terminated due to connection timeout',
  'Connection terminated unexpectedly',
  'timeout expired'
];


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
  // Provide NULLIF(text, text) for tests
  pg.registerFunction({
    name: 'nullif',
    args: ['text', 'text'],
    returns: 'text',
    implementation: (a, b) => (a === b ? null : a),
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
  const connectionString = process.env.DATABASE_URL && process.env.DATABASE_URL.replace(/^\s*["']|["']\s*$/g, '');
  const caPath = process.env.DB_CA_PATH || '/etc/secrets/supabase-ca.crt';

  let ca;
  const stripQuotes = (s) => s && s.replace(/^\s*["']?|["']?\s*$/g, '');
  const normalizePem = (s) =>
    s && stripQuotes(String(s))
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n');
  // 1) Prefer explicit PEM content from environment
  const caPemEnvRaw = process.env.DB_CA_CERT_PEM || process.env.DB_CA_CERT || null;
  const caPemEnv = normalizePem(caPemEnvRaw);
  if (caPemEnv) {
    ca = caPemEnv;
  }
  // 2) If SUPABASE_CA_CERT is provided as raw PEM, use it as-is
  const supabaseCaRaw = normalizePem(process.env.SUPABASE_CA_CERT);
  if (!ca && supabaseCaRaw && /-----BEGIN CERTIFICATE-----/.test(supabaseCaRaw)) {
    ca = supabaseCaRaw;
  }
  // 3) Otherwise accept base64-encoded certs from env
  if (!ca) {
    const caB64EnvRaw = process.env.DB_CA_CERT_B64 || process.env.SUPABASE_CA_CERT || null;
    const caB64Env = caB64EnvRaw && stripQuotes(caB64EnvRaw);
    if (caB64Env) {
      try {
        ca = Buffer.from(String(caB64Env).replace(/\s+/g, ''), 'base64').toString('utf8');
      } catch (_) {
        // ignore
      }
    }
  }
  // 4) Finally, try reading from a file path if provided
  if (!ca) {
    try {
      ca = fs.readFileSync(caPath, 'utf8');
    } catch (err) {
      // Fall back to default trust store if custom CA is not available
    }
  }

  const baseConfig = connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT) || undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      };

  // Determine SSL mode from env or connection string
  let sslmode = (process.env.PGSSLMODE || 'require').toLowerCase();
  if (connectionString) {
    try {
      const m = /[?&]sslmode=([^&]+)/i.exec(connectionString);
      if (m && m[1]) sslmode = decodeURIComponent(m[1]).toLowerCase();
    } catch (_) {}
  }
  const useSSL = sslmode !== 'disable';

  // Conservative pool to play nice with external poolers (e.g., Supabase 6543)
  // and improve resilience on cold starts / transient network hiccups.
  // Honor sslmode overrides
  let rejectUnauthorized = (process.env.PGSSL_REJECT_UNAUTHORIZED || 'true') !== 'false';
  if (sslmode === 'no-verify' || sslmode === 'allow' || sslmode === 'prefer') {
    // "no-verify" explicitly disables verification; "allow"/"prefer" should not block on verify
    rejectUnauthorized = false;
  } else if (sslmode === 'verify-ca' || sslmode === 'verify-full') {
    rejectUnauthorized = true;
  }
  const sslConfig = useSSL
    ? {
        ca: ca ? (Array.isArray(ca) ? ca : [ca]) : undefined,
        rejectUnauthorized,
        minVersion: 'TLSv1.2',
      }
    : false;

  function buildPool(overrideRejectUnauthorized) {
    const effectiveSsl = useSSL
      ? {
          ...sslConfig,
          rejectUnauthorized:
            typeof overrideRejectUnauthorized === 'boolean'
              ? overrideRejectUnauthorized
              : sslConfig && typeof sslConfig === 'object'
              ? sslConfig.rejectUnauthorized
              : undefined,
        }
      : false;
    return new Pool({
      ...baseConfig,
      ssl: effectiveSsl,
      enableChannelBinding: useSSL,
      max: Number(process.env.PGPOOL_MAX) || 20,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 0,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_DELAY_MS) || 30000,
    });
  }

  pool = buildPool();

  pool.query('SELECT 1').catch(async (err) => {
    if (err && err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.warn('[db] TLS verify failed with self-signed chain; retrying with no-verify');
      try { await pool.end(); } catch (_) {}
      // Rebuild using discrete connection fields to avoid url sslmode overrides
      const url = process.env.DATABASE_URL && process.env.DATABASE_URL.replace(/^\s*["']|["']\s*$/g, '');
      if (url) {
        try {
          const u = new URL(url);
          pool = new Pool({
            host: u.hostname,
            port: Number(u.port) || 5432,
            user: decodeURIComponent(u.username || ''),
            password: decodeURIComponent(u.password || ''),
            database: (u.pathname || '/postgres').slice(1),
            ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
            enableChannelBinding: true,
            max: Number(process.env.PGPOOL_MAX) || 20,
            idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 0,
            connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
            keepAlive: true,
            keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_DELAY_MS) || 30000,
          });
        } catch (_) {
          pool = buildPool(false);
        }
      } else {
        pool = buildPool(false);
      }
      try { await pool.query('SELECT 1'); } catch (e2) {
        console.error('Database connection failed after fallback', e2);
      }
    } else {
      console.error('Database connection failed', err);
    }
  });
}

async function connectWithRetry(attempts = defaultConnectRetries) {
  let lastErr;
  let retried = false;
  for (let i = 0; i < attempts; i++) {
    try {
      return await pool.connect();
    } catch (err) {
      lastErr = err;
      const code = err && (err.code || err.errno);
      const message = err && typeof err.message === 'string' ? err.message : '';
      const shouldRetry =
        (code && transientErrorCodes.includes(code)) ||
        transientErrorMessages.some((fragment) => fragment && message.includes(fragment));
      if (!shouldRetry || i === attempts - 1) {
        break;
      }
      retried = true;
      const delay = Math.min(maxConnectDelayMs, baseConnectDelayMs * Math.pow(2, i));
      if (logger && logger.database && typeof logger.database.warn === 'function') {
        logger.database.warn('Database connection attempt failed; retrying', {
          attempt: i + 1,
          maxAttempts: attempts,
          code,
          message,
          delay,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  if (lastErr) {
    if (logger && logger.database && typeof logger.database.error === 'function') {
      logger.database.error('Database connection failed after retries', {
        attempts,
        retried,
        code: lastErr && (lastErr.code || lastErr.errno),
        message: lastErr && lastErr.message,
      });
    } else {
      console.error('Database connection failed after retries', lastErr);
    }
  }
  throw lastErr;
}

async function query(text, params) {
  const store = companyContext.getStore();
  const companyId = store && store.companyId;
  const sessionId = Symbol('session');
  const client = await connectWithRetry();
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

module.exports = { query, connect: () => connectWithRetry() };

