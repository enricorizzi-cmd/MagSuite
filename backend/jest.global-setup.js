const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Set USE_PG_MEM for all tests
process.env.USE_PG_MEM = 'true';
process.env.DEFAULT_COMPANY_ID = '1';

const db = require('./src/db');

module.exports = async () => {
  await db.query(
    'CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)'
  );
  await db.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies (lower(name))'
  );
  await db.query(
    "INSERT INTO companies(name) VALUES('A'), ('B') ON CONFLICT (name) DO NOTHING"
  );
};
