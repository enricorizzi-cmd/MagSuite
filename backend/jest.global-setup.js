const { execSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
  execSync('node db/migrate.js', {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env,
  });
};
