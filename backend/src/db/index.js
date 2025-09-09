const fs = require('fs');
const companyContext = require('../companyContext');

let pool;

if (process.env.USE_PG_MEM === 'true') {
  const { newDb } = require('pg-mem');
  const mem = newDb();
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
  if (companyId) {
    const client = await pool.connect();
    try {
      await client.query(`set app.current_company_id = ${companyId}`);
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
  return pool.query(text, params);
}

module.exports = { query, connect: () => pool.connect() };

