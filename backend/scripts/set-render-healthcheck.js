/*
  Set Render health check path to /health
  Requirements:
    - RENDER_API_TOKEN: your Render Personal Access Token
    - RENDER_SERVICE_ID: target service ID

  Usage:
    RENDER_API_TOKEN=... RENDER_SERVICE_ID=... node backend/scripts/set-render-healthcheck.js
*/
const https = require('https');

function request(method, path, body) {
  const token = process.env.RENDER_API_TOKEN;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!token) throw new Error('Missing RENDER_API_TOKEN');
  if (!serviceId) throw new Error('Missing RENDER_SERVICE_ID');
  const data = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.render.com',
        path: `/v1/services/${serviceId}${path}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Render API ${res.statusCode}: ${out}`));
          }
          try {
            resolve(JSON.parse(out));
          } catch {
            resolve(out);
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Read current service config
  const service = await request('GET', '');
  const current = {
    name: service.name,
    plan: service.plan,
    envVars: undefined, // leave untouched
    autoDeploy: service.autoDeploy,
    healthCheckPath: '/health',
  };
  // PATCH only the fields we need to change
  const updated = await request('PATCH', '', { healthCheckPath: '/health' });
  console.log('Health check path set to:', updated.healthCheckPath || current.healthCheckPath);
}

main().catch((e) => {
  console.error('Failed to set health check path:', e.message);
  process.exit(1);
});

