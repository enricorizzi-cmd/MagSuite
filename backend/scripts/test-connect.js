/*
 Non-destructive DB connectivity test for TLS issues.
 Usage:
   DATABASE_URL=... node scripts/test-connect.js
 Optional:
   DB_CA_CERT_B64, DB_CA_CERT, DB_CA_CERT_PEM, SUPABASE_CA_CERT
   PGSSLMODE=require|verify-full|no-verify|disable (default: require)
   PGSSL_REJECT_UNAUTHORIZED=false|true (overrides ssl verify)
*/

const { Pool } = require('pg');

function stripQuotes(s) {
  return s && s.replace(/^\s*["']?|["']?\s*$/g, '');
}
function normalizePem(s) {
  return (
    s &&
    stripQuotes(String(s))
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
  );
}

const connectionString = process.env.DATABASE_URL && stripQuotes(process.env.DATABASE_URL);
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(2);
}

let ca;
// 1) direct PEM in env
const caPem = normalizePem(process.env.DB_CA_CERT_PEM || process.env.DB_CA_CERT);
if (caPem) ca = caPem;
// 2) SUPABASE_CA_CERT may be PEM already
const supaPem = normalizePem(process.env.SUPABASE_CA_CERT);
if (!ca && supaPem && /-----BEGIN CERTIFICATE-----/.test(supaPem)) ca = supaPem;
// 3) else consider base64 envs
if (!ca) {
  const b64Raw = process.env.DB_CA_CERT_B64 || process.env.SUPABASE_CA_CERT;
  if (b64Raw) {
    const sanitized = stripQuotes(String(b64Raw)).replace(/\s+/g, '');
    const pad = sanitized.padEnd(sanitized.length + ((4 - (sanitized.length % 4)) % 4), '=');
    try {
      ca = Buffer.from(pad, 'base64').toString('utf8');
    } catch (_) {}
  }
}

let sslmode = (process.env.PGSSLMODE || 'require').toLowerCase();
try {
  const m = /[?&]sslmode=([^&]+)/i.exec(connectionString);
  if (m && m[1]) sslmode = decodeURIComponent(m[1]).toLowerCase();
} catch (_) {}

const useSSL = sslmode !== 'disable';
let rejectUnauthorized = (process.env.PGSSL_REJECT_UNAUTHORIZED || 'true') !== 'false';
if (sslmode === 'no-verify' || sslmode === 'allow' || sslmode === 'prefer') {
  rejectUnauthorized = false;
} else if (sslmode === 'verify-ca' || sslmode === 'verify-full') {
  rejectUnauthorized = true;
}

const sslConfig = useSSL
  ? {
      ca: ca ? (Array.isArray(ca) ? ca : [ca]) : undefined,
      rejectUnauthorized,
      minVersion: 'TLSv1.2',
    }
  : false;

console.log('Effective SSL:', {
  sslmode,
  useSSL,
  hasCA: Boolean(ca),
  rejectUnauthorized,
});

const pool = new Pool({ connectionString, ssl: sslConfig, max: 1 });

pool
  .query("select current_user, version()")
  .then((r) => {
    console.log('Connected OK:', r.rows[0]);
    return pool.end();
  })
  .catch((err) => {
    console.error('Connection failed:', err);
    process.exit(1);
  });

