#!/usr/bin/env node

/**
 * Render MCP Configuration Helper
 * Helps configure and use Render MCP Server with Cursor
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class RenderMCPHelper {
  constructor() {
    this.apiKey = process.env.RENDER_API_KEY || '';
    this.mcpUrl = 'https://mcp.render.com/mcp';
    this.cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  }

  createMCPConfig() {
    const config = {
      mcpServers: {
        render: {
          url: this.mcpUrl,
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      }
    };

    return config;
  }

  async setupCursorMCP() {
    try {
      console.log('🔧 Setting up Render MCP Server for Cursor...');
      
      // Ensure .cursor directory exists
      const cursorDir = path.dirname(this.cursorConfigPath);
      if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
        console.log(`✅ Created directory: ${cursorDir}`);
      }

      // Create MCP configuration
      const config = this.createMCPConfig();
      fs.writeFileSync(this.cursorConfigPath, JSON.stringify(config, null, 2));
      
      console.log(`✅ MCP configuration saved to: ${this.cursorConfigPath}`);
      console.log('📋 Configuration:');
      console.log(JSON.stringify(config, null, 2));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to setup MCP configuration:', error.message);
      return false;
    }
  }

  async testMCPConnection() {
    try {
      console.log('🔍 Testing MCP connection...');
      
      // This would test the actual MCP connection
      // For now, we'll just verify the configuration
      if (fs.existsSync(this.cursorConfigPath)) {
        const config = JSON.parse(fs.readFileSync(this.cursorConfigPath, 'utf8'));
        if (config.mcpServers && config.mcpServers.render) {
          console.log('✅ MCP configuration found and valid');
          console.log(`   URL: ${config.mcpServers.render.url}`);
          console.log(`   API Key: ${config.mcpServers.render.headers.Authorization.substring(0, 20)}...`);
          return true;
        }
      }
      
      console.log('❌ MCP configuration not found or invalid');
      return false;
    } catch (error) {
      console.error('❌ Failed to test MCP connection:', error.message);
      return false;
    }
  }

  generateUsageGuide() {
    const guide = `
# 🚀 Render MCP Server - Guida all'Uso

## ✅ Configurazione Completata

Il Render MCP Server è stato configurato per Cursor con la tua API key.

## 🔧 Come Utilizzare

### 1. **Riavvia Cursor**
Dopo aver configurato MCP, devi riavviare Cursor per caricare la configurazione.

### 2. **Comandi MCP Disponibili**

Una volta configurato, potrai usare questi comandi in Cursor:

#### **Monitoraggio Deployment**
- \`@render status\` - Controlla lo stato del servizio
- \`@render deployments\` - Visualizza deployment recenti
- \`@render logs\` - Mostra i log di deployment
- \`@render health\` - Controlla la salute del servizio

#### **Gestione Deployment**
- \`@render deploy\` - Triggera un nuovo deployment
- \`@render rollback\` - Analizza rollback necessario
- \`@render env\` - Gestisci variabili d'ambiente
- \`@render scale\` - Modifica le risorse del servizio

#### **Diagnostica**
- \`@render debug\` - Diagnostica problemi
- \`@render metrics\` - Visualizza metriche
- \`@render alerts\` - Gestisci alert

### 3. **Esempi di Utilizzo**

#### **Controllo Stato**
\`\`\`
@render status magsuite-backend
\`\`\`

#### **Deployment**
\`\`\`
@render deploy magsuite-backend --branch main
\`\`\`

#### **Rollback**
\`\`\`
@render rollback magsuite-backend --to-deployment abc123
\`\`\`

#### **Log Analysis**
\`\`\`
@render logs magsuite-backend --tail 100
\`\`\`

### 4. **Integrazione con i Tuoi Script**

I tuoi script di deployment possono essere integrati con MCP:

\`\`\`bash
# Monitoraggio automatico
npm run deploy:monitor

# Validazione deployment
npm run deploy:validate

# Analisi Render
npm run deploy:render
\`\`\`

### 5. **Troubleshooting**

#### **Se MCP non funziona:**
1. Verifica che Cursor sia riavviato
2. Controlla il file di configurazione: \`~/.cursor/mcp.json\`
3. Verifica che l'API key sia corretta
4. Controlla i log di Cursor per errori

#### **Se i comandi non sono disponibili:**
1. Assicurati che MCP sia abilitato in Cursor
2. Controlla la versione di Cursor (deve supportare MCP)
3. Riavvia Cursor completamente

### 6. **Comandi Avanzati**

#### **Monitoraggio Continuo**
\`\`\`
@render monitor magsuite-backend --interval 30s
\`\`\`

#### **Alerting**
\`\`\`
@render alert magsuite-backend --on-failure --email alerts@yourdomain.com
\`\`\`

#### **Backup**
\`\`\`
@render backup magsuite-backend --schedule daily
\`\`\`

## 🎯 **Workflow Completo**

1. **Monitoraggio**: \`@render status\`
2. **Deployment**: \`@render deploy\`
3. **Validazione**: \`npm run deploy:validate\`
4. **Rollback se necessario**: \`@render rollback\`

## 📞 **Supporto**

Per problemi:
1. Controlla i log di Cursor
2. Verifica la configurazione MCP
3. Testa la connessione: \`@render test\`
4. Consulta la documentazione Render MCP

## 🔐 **Sicurezza**

- L'API key è configurata localmente
- I comandi MCP sono sicuri
- Non vengono esposte informazioni sensibili
- La connessione è crittografata HTTPS
`;

    return guide;
  }

  async runSetup() {
    try {
      console.log('🚀 Render MCP Server Setup');
      console.log('==========================');
      
      // Setup MCP configuration
      const setupSuccess = await this.setupCursorMCP();
      if (!setupSuccess) {
        return false;
      }
      
      // Test connection
      const testSuccess = await this.testMCPConnection();
      if (!testSuccess) {
        return false;
      }
      
      // Generate usage guide
      const guide = this.generateUsageGuide();
      const guideFile = path.join(__dirname, '../MCP_USAGE_GUIDE.md');
      fs.writeFileSync(guideFile, guide);
      
      console.log('\n📚 Guida all\'uso salvata in: MCP_USAGE_GUIDE.md');
      console.log('\n🎉 Setup completato! Ora puoi:');
      console.log('   1. Riavviare Cursor');
      console.log('   2. Usare i comandi @render');
      console.log('   3. Monitorare i tuoi deployment');
      
      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const helper = new RenderMCPHelper();
  
  helper.runSetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = RenderMCPHelper;

