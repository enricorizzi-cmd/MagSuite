// Fix backend/.env formatting for DATABASE_URL and optional CA path without printing secrets
const fs = require('fs');
const path = require('path');

function main() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('backend/.env not found');
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let changed = false;
  let hasCa = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^DATABASE_URL\s*=\s*(.*)$/.exec(line);
    if (m) {
      let val = m[1].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
        changed = true;
      }
      if (val.includes('/postgressslmode=')) {
        val = val.replace('/postgressslmode=', '/postgres?sslmode=');
        changed = true;
      }
      lines[i] = 'DATABASE_URL=' + val;
    }
    if (/^DB_CA_PATH\s*=/.test(line)) {
      hasCa = true;
    }
  }
  const repoCa = path.resolve(__dirname, '..', '..', 'supabase-ca.crt');
  if (!hasCa && fs.existsSync(repoCa)) {
    lines.push('DB_CA_PATH=' + repoCa);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log('Updated backend/.env');
  } else {
    console.log('No changes needed');
  }
}

main();

