#!/usr/bin/env node

/**
 * Script per aggiornare solo la DATABASE_URL su Render
 */

const https = require('https');

async function updateDatabaseUrl() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  
  if (!apiKey || !serviceId) {
    console.error('❌ Missing required environment variables:');
    console.error('   RENDER_API_KEY');
    console.error('   RENDER_SERVICE_ID');
    process.exit(1);
  }

  console.log('🔧 Updating DATABASE_URL on Render...\n');
  
  // URL corretto per Supabase (senza password per ora)
  const databaseUrl = 'postgresql://postgres.mojuhmhubjnocogxxwbh:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
  
  const response = await new Promise((resolve, reject) => {
    const url = `https://api.render.com/v1/services/${serviceId}/env-vars`;
    const options = {
      method: 'POST',
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
    req.write(JSON.stringify({ key: 'DATABASE_URL', value: databaseUrl }));
    req.end();
  });
  
  if (response.status === 201 || response.status === 200) {
    console.log('✅ DATABASE_URL updated successfully');
    console.log('⚠️  Note: You need to update the password in the DATABASE_URL with the real Supabase password');
    return true;
  } else {
    console.log('❌ Failed to update DATABASE_URL:', response.data);
    return false;
  }
}

// Esegui l'aggiornamento
updateDatabaseUrl()
  .then(success => {
    if (success) {
      console.log('\n🚀 DATABASE_URL updated! Now trigger a new deployment.');
      process.exit(0);
    } else {
      console.log('\n❌ Failed to update DATABASE_URL');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  });
