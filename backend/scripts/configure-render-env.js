#!/usr/bin/env node

/**
 * Script per configurare le variabili d'ambiente su Render
 */

const https = require('https');

class RenderEnvConfigurator {
  constructor(apiKey, serviceId) {
    this.apiKey = apiKey;
    this.serviceId = serviceId;
    this.baseUrl = 'https://api.render.com/v1';
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
      }

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
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async setEnvironmentVariable(key, value) {
    console.log(`Setting ${key}...`);
    const response = await this.makeRequest(`/services/${this.serviceId}/env-vars`, 'POST', {
      key,
      value
    });
    
    if (response.status === 201 || response.status === 200) {
      console.log(`✅ ${key} set successfully`);
      return true;
    } else {
      console.log(`❌ Failed to set ${key}:`, response.data);
      return false;
    }
  }

  async configureEssentialVariables() {
    console.log('🔧 Configuring essential environment variables...\n');
    
    const variables = {
      // Database (placeholder - needs real Supabase URL)
      'DATABASE_URL': 'postgres://postgres:password@db.supabase.co:5432/postgres',
      
      // JWT Secrets (generated)
      'ACCESS_SECRET': 'aa07bc68810086d08005aa8d50c11fcf654cadd2f06cfa0301a06d7f6910e50f',
      'REFRESH_SECRET': 'f775b39a49b3957e3c596b7d81192127fe9a419a22cfb2a92c24768053b85f11',
      'SSO_SECRET': '4e9ff481e1a8f6f00186c671f1b30dddc9f9185cb3430052e42688ac9e95843c',
      
      // API Key (generated)
      'API_KEY': '45b619ac4c6242e6842acc3943af5f9f',
      
      // File Encryption (generated)
      'FILE_ENCRYPTION_KEY': '51sU37yCdsDQ2+23PUia7VEyve4JEu8HMMteNClCMn0=',
      
      // Application Config
      'NODE_ENV': 'production',
      'PORT': '10000',
      
      // Performance
      'PGPOOL_MAX': '20',
      'PG_IDLE_TIMEOUT_MS': '30000',
      'PG_CONNECTION_TIMEOUT_MS': '10000'
    };

    let successCount = 0;
    let totalCount = Object.keys(variables).length;

    for (const [key, value] of Object.entries(variables)) {
      const success = await this.setEnvironmentVariable(key, value);
      if (success) successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n📊 Configuration Summary:`);
    console.log(`✅ Successfully configured: ${successCount}/${totalCount} variables`);
    
    if (successCount === totalCount) {
      console.log('🎉 All essential variables configured!');
      console.log('⚠️  Note: DATABASE_URL needs to be updated with real Supabase credentials');
    } else {
      console.log('❌ Some variables failed to configure');
    }

    return successCount === totalCount;
  }
}

// CLI interface
if (require.main === module) {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  
  if (!apiKey || !serviceId) {
    console.error('❌ Missing required environment variables:');
    console.error('   RENDER_API_KEY');
    console.error('   RENDER_SERVICE_ID');
    process.exit(1);
  }

  const configurator = new RenderEnvConfigurator(apiKey, serviceId);
  
  configurator.configureEssentialVariables()
    .then(success => {
      if (success) {
        console.log('\n🚀 Ready to trigger deployment!');
        process.exit(0);
      } else {
        console.log('\n❌ Configuration incomplete');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Configuration failed:', error.message);
      process.exit(1);
    });
}

module.exports = RenderEnvConfigurator;
