const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Skip migration if using pg-mem for testing
if (process.env.USE_PG_MEM === 'true') {
  console.log('[migrate] Skipping migration - using pg-mem for testing');
  process.exit(0);
}

const connectionString = (process.env.DATABASE_URL && process.env.DATABASE_URL.replace(/^\s*["']|["']\s*$/g, '')) ||
  'postgres://postgres:postgres@localhost:5432/postgres';
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
      const sanitized = String(caB64Env).replace(/\s+/g, '');
      const padded = sanitized.padEnd(
        sanitized.length + ((4 - (sanitized.length % 4)) % 4),
        '='
      );
      ca = Buffer.from(padded, 'base64').toString('utf8');
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
    // Custom CA not provided; rely on default trust store
  }
}

// Determine SSL mode from env or connection string
let sslmode = (process.env.PGSSLMODE || 'require').toLowerCase();
if (connectionString) {
  try {
    const m = /[?&]sslmode=([^&]+)/i.exec(connectionString);
    if (m && m[1]) sslmode = decodeURIComponent(m[1]).toLowerCase();
  } catch (_) {}
}
const useSSL = sslmode !== 'disable';

let rejectUnauthorized = (process.env.PGSSL_REJECT_UNAUTHORIZED || 'true') !== 'false';
if (sslmode === 'no-verify' || sslmode === 'allow' || sslmode === 'prefer') {
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

const supabaseConnectionErrorCodes = new Set(['ETIMEDOUT','ECONNREFUSED','ECONNRESET','EHOSTUNREACH','ENETUNREACH','EAI_AGAIN']);
const supabaseConnectionErrorFragments = [
  'timeout',
  'refused',
  'unreachable',
  'getaddrinfo',
  'failed to look up address',
];

function flattenErrors(err) {
  const queue = [err];
  const seen = new Set();
  const result = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    if (Array.isArray(current.errors)) {
      for (const nested of current.errors) {
        queue.push(nested);
      }
    }
    if (current.cause) {
      queue.push(current.cause);
    }
  }
  return result;
}

function isSupabasePoolerConnection() {
  try {
    const parsed = new URL(connectionString);
    return /\.pooler\.supabase\.com$/i.test(parsed.hostname);
  } catch (_) {
    return false;
  }
}

function buildSupabaseDirectConnectionString() {
  const override = stripQuotes(process.env.SUPABASE_DIRECT_URL || '');
  if (override) {
    return override;
  }
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch (_) {
    return null;
  }
  if (!/\.pooler\.supabase\.com$/i.test(parsed.hostname)) {
    return null;
  }
  const rawUser = decodeURIComponent(parsed.username || '');
  const userParts = rawUser.split('.');
  const directUser =
    stripQuotes(process.env.SUPABASE_DIRECT_USER || '') ||
    (userParts[0] || rawUser || 'postgres');
  const projectRef =
    stripQuotes(process.env.SUPABASE_PROJECT_REF || '') ||
    (userParts.length > 1 ? userParts.slice(1).join('.') : '');
  const host =
    stripQuotes(process.env.SUPABASE_DIRECT_HOST || '') ||
    (projectRef ? `db.${projectRef}.supabase.co` : '');
  if (!host) {
    return null;
  }
  const password = decodeURIComponent(parsed.password || '');
  const database = (parsed.pathname || '/postgres').slice(1) || 'postgres';
  const params = new URLSearchParams(parsed.search);
  const sslmodeOverride = stripQuotes(process.env.SUPABASE_DIRECT_SSLMODE || '');
  const sslmode = sslmodeOverride || params.get('sslmode') || 'require';
  params.set('sslmode', sslmode);
  const query = params.toString();
  const port = stripQuotes(process.env.SUPABASE_DIRECT_PORT || '') || '5432';
  const authPassword = password ? `:${encodeURIComponent(password)}` : '';
  const authSection = `${encodeURIComponent(directUser)}${authPassword}`;
  return `postgresql://${authSection}@${host}:${port}/${database}${query ? `?${query}` : ''}`;
}

function shouldAttemptSupabaseDirect(err) {
  if (!isSupabasePoolerConnection()) {
    return false;
  }
  const flattened = flattenErrors(err);
  if (!flattened.length) {
    return false;
  }
  for (const item of flattened) {
    const code = item && (item.code || item.errno);
    if (code && supabaseConnectionErrorCodes.has(String(code))) {
      return true;
    }
  }
  return flattened.some(
    (item) =>
      item &&
      typeof item.message === 'string' &&
      supabaseConnectionErrorFragments.some((fragment) =>
        fragment && item.message.toLowerCase().includes(fragment)
      )
  );
}

function createPool(options = {}) {
  const { connectionString: connStr = connectionString, rejectUnauthorized: overrideRejectUnauthorized } = options || {};
  let effectiveSsl = false;
  if (useSSL) {
    const base = sslConfig && typeof sslConfig === 'object' ? { ...sslConfig } : {};
    if (typeof overrideRejectUnauthorized === 'boolean') {
      base.rejectUnauthorized = overrideRejectUnauthorized;
    }
    if (!base.minVersion) {
      base.minVersion = 'TLSv1.2';
    }
    effectiveSsl = base;
  }

  return new Pool({
    connectionString: connStr,
    ssl: effectiveSsl,
    enableChannelBinding: useSSL,
    max: Number(process.env.PGPOOL_MAX) || 3,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_DELAY_MS) || 30000,
  });
}


let pool = createPool();

async function run() {
  let dir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(dir)) {
    // Fallback when running locally from the repo root structure
    const alt = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    if (fs.existsSync(alt)) dir = alt;
  }
  // Probe connectivity; if TLS verification blocks with a self-signed chain,
  // fallback to no-verify to support Supabase pooled endpoints.
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    if (err && err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.warn('[migrate] TLS verify failed with self-signed chain; retrying with no-verify');
      try { await pool.end(); } catch (_) {}

      // Build a config that ignores sslmode in the URL by passing discrete fields
      // and disables verification explicitly (no CA to avoid chain errors).
      const u = new URL(connectionString);
      const alt = new Pool({
        host: u.hostname,
        port: Number(u.port) || 5432,
        user: decodeURIComponent(u.username || ''),
        password: decodeURIComponent(u.password || ''),
        database: (u.pathname || '/postgres').slice(1),
        ssl: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
        enableChannelBinding: true,
        max: Number(process.env.PGPOOL_MAX) || 3,
        connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_DELAY_MS) || 30000,
      });
      pool = alt;
      await pool.query('SELECT 1');
    } else if (shouldAttemptSupabaseDirect(err)) {
      const directConnection = buildSupabaseDirectConnectionString();
      if (directConnection) {
        const flattened = flattenErrors(err);
        const codes = [];
        for (const item of flattened) {
          const code = item && (item.code || item.errno);
          if (code && !codes.includes(code)) {
            codes.push(code);
          }
        }
        const codeSummary = codes.length ? codes.join(', ') : 'unknown';
        console.warn(`[migrate] Supabase pooler connection failed (${codeSummary}); retrying with direct endpoint`);
        try { await pool.end(); } catch (_) {}
        try {
          pool = createPool({ connectionString: directConnection });
          await pool.query('SELECT 1');
        } catch (directErr) {
          console.error('[migrate] Supabase direct endpoint fallback failed', directErr);
          throw err;
        }
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }\r\n\r\n  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename text primary key)');
  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (rows.length > 0) {
      console.log(`Skipping ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Running ${file}`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
  }
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});





