const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const caPath = process.env.DB_CA_PATH || '/etc/secrets/supabase-ca.crt';

let ca;
try {
  ca = fs.readFileSync(caPath, 'utf8');
} catch (err) {
  // Custom CA not provided; rely on default trust store
}

const useSSL = process.env.PGSSLMODE !== 'disable';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' } : false,
  enableChannelBinding: useSSL,
});

async function run() {
  const dir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Running ${file}`);
    await pool.query(sql);
  }
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
