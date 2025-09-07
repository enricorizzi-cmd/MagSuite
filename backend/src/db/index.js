const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ca = fs.readFileSync(path.join(__dirname, '..', '..', 'prod-ca-2021.crt'), 'utf8');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true, ca } })
  : new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: { rejectUnauthorized: true, ca },
    });

module.exports = pool;

