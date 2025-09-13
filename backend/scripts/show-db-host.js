// Print DB host/port from backend/.env without revealing secrets
const fs = require('fs');
const path = require('path');

function parseEnvLines(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\w+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function main() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('backend/.env not found');
    process.exit(0);
  }
  const env = parseEnvLines(fs.readFileSync(envPath, 'utf8'));
  if (env.DATABASE_URL) {
    let val = env.DATABASE_URL.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    try {
      const u = new URL(val);
      console.log(`DATABASE_URL host=${u.hostname} port=${u.port||'(default)'} db=${u.pathname.replace(/^\//,'')}`);
      return;
    } catch {}
  }
  if (env.PGHOST) {
    console.log(`PGHOST host=${env.PGHOST} port=${env.PGPORT||'(default)'} db=${env.PGDATABASE||'(unset)'}`);
  } else {
    console.log('No DATABASE_URL or PGHOST found');
  }
}

main();

