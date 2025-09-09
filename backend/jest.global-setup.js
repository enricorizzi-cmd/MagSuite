const { execSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

module.exports = async () => {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
  execSync('node db/migrate.js', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("INSERT INTO companies(name) VALUES('A'), ('B')");
  await pool.end();
};
