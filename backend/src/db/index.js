const { Pool } = require('pg');

let pool;
if (process.env.NODE_ENV === 'test') {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool();
} else {
  const {
    PGHOST,
    PGUSER,
    PGPASSWORD,
    PGDATABASE,
    PGPORT,
    DATABASE_URL,
  } = process.env;

  if (DATABASE_URL) {
    pool = new Pool({ connectionString: DATABASE_URL });
  } else {
    pool = new Pool({
      host: PGHOST,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      port: PGPORT ? Number(PGPORT) : undefined,
    });
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
