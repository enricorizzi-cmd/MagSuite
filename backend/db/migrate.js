const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  enableChannelBinding: useSSL,
  max: Number(process.env.PGPOOL_MAX) || 3,
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_DELAY_MS) || 30000,
});

async function run() {
  let dir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (!fs.existsSync(dir)) {
    // Fallback when running locally from the repo root structure
    const alt = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    if (fs.existsSync(alt)) dir = alt;
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
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
