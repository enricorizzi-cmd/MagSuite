const https = require('https');

const RENDER_API_KEY = process.env.RENDER_API_KEY || 'rnd_ublyTLPyPqnIHTRNnsi9w65975mn';
const SERVICE_ID = 'srv-d2viim8gjchc73b9icgg';

console.log('🔍 Checking Render service status...');

const options = {
  hostname: 'api.render.com',
  path: `/v1/services/${SERVICE_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${RENDER_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const service = JSON.parse(data);
      console.log('📊 Service Status:', service.service?.serviceDetails?.status || 'Unknown');
      console.log('🌐 Service URL:', service.service?.serviceDetails?.url || 'Unknown');
      console.log('📅 Last Deploy:', service.service?.serviceDetails?.lastDeployAt || 'Unknown');
      
      if (service.service?.serviceDetails?.status === 'failed') {
        console.log('❌ SERVICE IS FAILED - Need to fix!');
      } else if (service.service?.serviceDetails?.status === 'live') {
        console.log('✅ SERVICE IS LIVE');
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request error:', error.message);
});

req.end();
