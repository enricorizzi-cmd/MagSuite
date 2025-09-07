const { Pool } = require('pg');

const ssl = process.env.DATABASE_URL?.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : undefined;

let pool;
if (process.env.NODE_ENV === 'test') {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pg = db.adapters.createPg();
  pool = new pg.Pool({ ssl });
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
    pool = new Pool({ connectionString: DATABASE_URL, ssl });
  } else {
    pool = new Pool({
      host: PGHOST,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      port: PGPORT ? Number(PGPORT) : undefined,
      ssl,
    });
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
