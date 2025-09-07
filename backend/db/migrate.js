const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const ca = fs.readFileSync(path.join(__dirname, '..', 'prod-ca-2021.crt'), 'utf8');
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true, ca } });

async function run() {
  const dir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
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
