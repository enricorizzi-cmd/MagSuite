const { Pool } = require('pg');

let pool;
if (process.env.NODE_ENV === 'test') {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool();
} else {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres';
  pool = new Pool({ connectionString });
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
