const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ca = fs.readFileSync(path.join(__dirname, '..', '..', 'prod-ca-2021.crt'), 'utf8');

// Allow opt-out of certificate verification when dealing with self-signed certs.
// Set ALLOW_SELF_SIGNED_CERT=true in environments (like Render) where the
// database uses a self-signed certificate. When enabled, also set the global
// Node.js flag to permit self-signed certificates.
if (process.env.ALLOW_SELF_SIGNED_CERT === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const sslConfig = process.env.ALLOW_SELF_SIGNED_CERT === 'true'
  ? { rejectUnauthorized: false }
  : { rejectUnauthorized: true, ca };

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig })
  : new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: sslConfig,
    });

module.exports = pool;

