#!/usr/bin/env node

/**
 * Script per testare l'API key di Render
 */

const https = require('https');

async function testRenderAPI() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  
  console.log('🔍 Testing Render API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`Service ID: ${serviceId || 'NOT SET'}`);
  console.log('');
  
  if (!apiKey || !serviceId) {
    console.error('❌ Missing required environment variables');
    return false;
  }

  try {
    const response = await new Promise((resolve, reject) => {
      const url = `https://api.render.com/v1/services/${serviceId}`;
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (error) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
    
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ API key is valid');
      console.log(`Service: ${response.data.name}`);
      console.log(`Status: ${response.data.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
      return true;
    } else {
      console.log('❌ API key is invalid or service not found');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ API test failed:', error.message);
    return false;
  }
}

// Esegui il test
testRenderAPI()
  .then(success => {
    if (success) {
      console.log('\n🎉 API test successful!');
      process.exit(0);
    } else {
      console.log('\n❌ API test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
