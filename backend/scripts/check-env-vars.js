#!/usr/bin/env node

/**
 * Script per controllare le variabili d'ambiente esistenti su Render
 */

const https = require('https');

async function checkEnvironmentVariables() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  
  console.log('🔍 Checking existing environment variables...\n');
  
  if (!apiKey || !serviceId) {
    console.error('❌ Missing required environment variables');
    return false;
  }

  try {
    const response = await new Promise((resolve, reject) => {
      const url = `https://api.render.com/v1/services/${serviceId}/env-vars`;
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
      console.log('✅ Environment variables retrieved successfully');
      console.log(`Found ${response.data.length} environment variables:`);
      
      response.data.forEach(envVar => {
        const value = envVar.value ? envVar.value.substring(0, 20) + '...' : 'NOT SET';
        console.log(`  ${envVar.key}: ${value}`);
      });
      
      return true;
    } else {
      console.log('❌ Failed to retrieve environment variables');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    return false;
  }
}

// Esegui il controllo
checkEnvironmentVariables()
  .then(success => {
    if (success) {
      console.log('\n🎉 Environment variables check completed!');
      process.exit(0);
    } else {
      console.log('\n❌ Environment variables check failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  });
