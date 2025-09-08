const fs = require('fs');
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

const pool = new Pool({
  ...baseConfig,
  ssl: { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  enableChannelBinding: true,
});

pool.query('SELECT 1').catch((err) => {
  console.error('Database connection failed', err);
});

module.exports = pool;

