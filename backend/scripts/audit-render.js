/*
  Render service audit via API
  Requirements:
    - Set RENDER_API_TOKEN (Personal Access Token)
    - Set RENDER_SERVICE_ID (target service ID)
  Usage:
    node backend/scripts/audit-render.js
*/
const https = require('https');

function api(path) {
  const token = process.env.RENDER_API_TOKEN;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!token) throw new Error('Missing RENDER_API_TOKEN');
  if (!serviceId) throw new Error('Missing RENDER_SERVICE_ID');
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.render.com',
      path: `/v1/services/${serviceId}${path || ''}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`Render API ${res.statusCode}: ${data}`));
        }
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function flag(val) { return val ? 'set' : 'missing'; }

async function main() {
  const service = await api('');
  console.log('Service:', service.name, service.type, service.region || '');
  console.log('Repo:', service.repo || '(manual)');
  console.log('Dockerfile:', service.dockerfilePath || '(default)');
  console.log('Health check path:', service.healthCheckPath || '(unset)');
  console.log('Auto deploy:', service.autoDeploy);

  // env vars
  const envs = await api('/env-vars');
  const get = (k) => envs.find((e) => e.key === k);
  const keys = [
    'DATABASE_URL','PGHOST','PGUSER','PGDATABASE','ACCESS_SECRET','REFRESH_SECRET','SSO_SECRET',
    'API_KEY','FILE_ENCRYPTION_KEY','SUPABASE_CA_CERT','CORS_ORIGIN','SENTRY_DSN','VAPID_PUBLIC','VAPID_PRIVATE'
  ];
  console.log('\nEnv vars (presence only):');
  for (const k of keys) {
    console.log('-', k, flag(get(k)));
  }

  // recommendations
  console.log('\nRecommendations:');
  if (!get('DATABASE_URL') && !(get('PGHOST') && get('PGUSER') && get('PGDATABASE'))) {
    console.log('- Configure DATABASE_URL (prefer) or PGHOST/PGUSER/PGDATABASE/PGPASSWORD');
  }
  if (!get('ACCESS_SECRET') || !get('REFRESH_SECRET')) {
    console.log('- ACCESS_SECRET/REFRESH_SECRET are required');
  }
  if (!get('SUPABASE_CA_CERT')) {
    console.log('- If using Supabase pooled (6543), set SUPABASE_CA_CERT (base64 of CA)');
  }
  if (!service.healthCheckPath) {
    console.log('- Set health check path to /health');
  }
}

main().catch((e) => { console.error('audit-render failed:', e.message); process.exit(1); });

