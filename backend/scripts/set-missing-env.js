const https = require('https');

const apiKey = process.env.RENDER_API_KEY;
const serviceId = 'srv-d2viim8gjchc73b9icgg';

const variables = {
  'ACCESS_SECRET': 'aa07bc68810086d08005aa8d50c11fcf654cadd2f06cfa0301a06d7f6910e50f',
  'API_KEY': '45b619ac4c6242e6842acc3943af5f9f'
};

function setVar(key, value) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.render.com',
      path: '/v1/services/' + serviceId + '/env-vars',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(key + ':', res.statusCode === 201 ? '✅ OK' : '❌ FAILED (' + res.statusCode + ')');
        if (res.statusCode !== 201) {
          console.log('Response:', data);
        }
        resolve(res.statusCode === 201);
      });
    });

    req.write(JSON.stringify({key, value}));
    req.end();
  });
}

async function main() {
  console.log('🔧 Setting missing environment variables...\n');
  
  for (const [key, value] of Object.entries(variables)) {
    await setVar(key, value);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between requests
  }
  
  console.log('\n✅ Configuration complete!');
}

main().catch(console.error);
