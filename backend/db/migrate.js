const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const caPath = process.env.DB_CA_PATH || '/etc/secrets/supabase-ca.crt';

let ca;
// 1) Prefer explicit PEM content from environment
const caPemEnv = process.env.DB_CA_CERT_PEM || process.env.DB_CA_CERT || null;
if (caPemEnv) {
  ca = caPemEnv;
}
// 2) Otherwise accept base64-encoded certs from env
if (!ca) {
  const caB64Env = process.env.DB_CA_CERT_B64 || process.env.SUPABASE_CA_CERT || null;
  if (caB64Env) {
    try {
      ca = Buffer.from(caB64Env, 'base64').toString('utf8');
    } catch (_) {
      // ignore
    }
  }
}
// 3) Finally, try reading from a file path if provided
if (!ca) {
  try {
    ca = fs.readFileSync(caPath, 'utf8');
  } catch (err) {
    // Custom CA not provided; rely on default trust store
  }
}

const useSSL = process.env.PGSSLMODE !== 'disable';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' } : false,
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
