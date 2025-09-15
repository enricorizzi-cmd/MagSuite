# 🚀 MagSuite Deployment - Guida Rapida

## ⚡ Setup Veloce

### 1. Configura le variabili d'ambiente
```bash
# Copia il file di configurazione
cp deploy-config.example .env.deploy

# Modifica con i tuoi valori
RENDER_API_KEY=<RENDER_API_KEY>
RENDER_SERVICE_ID=il-tuo-service-id
APP_BASE_URL=https://la-tua-app.onrender.com

# Carica le variabili
source .env.deploy
```

### 2. Testa il deployment
```bash
# Controlla la salute locale
npm run deploy:monitor

# Valida il deployment attuale
npm run deploy:validate

# Analizza lo stato su Render
npm run deploy:render
```

## 🔧 Comandi Principali

| Comando | Descrizione |
|---------|-------------|
| `npm run deploy:monitor` | Monitora la salute locale |
| `npm run deploy:validate` | Valida il deployment |
| `npm run deploy:render` | Analizza Render |
| `npm run deploy:rollback` | Analizza rollback |
| `npm run deploy:auto` | Automazione completa |

## 🚨 Troubleshooting Veloce

### Problema: Deployment Fallito
```bash
# 1. Controlla lo stato
npm run deploy:render

# 2. Valida il deployment
npm run deploy:validate

# 3. Analizza rollback
npm run deploy:rollback
```

### Problema: Database Connection Failed
```bash
# Controlla la configurazione
curl https://your-app.onrender.com/health/diagnostics
```

### Problema: Service Not Live
```bash
# Analizza i deployment recenti
npm run deploy:render
```

## 📊 Endpoint di Monitoraggio

- `/health` - Salute generale
- `/readyz` - Readiness check
- `/health/config` - Configurazione
- `/health/diagnostics` - Diagnostica dettagliata

## 📁 Log e Report

Tutti i log sono salvati in `backend/logs/`:
- `deployment-monitor.log`
- `deployment-report.json`
- `render-deployment-report.json`
- `deployment-validation-report.json`
- `rollback-report.json`

## 🔄 Workflow Completo

```bash
# 1. Pre-deployment
npm run deploy:monitor

# 2. Deploy (manuale su Render)

# 3. Post-deployment
npm run deploy:validate

# 4. Se necessario
npm run deploy:rollback
```

## ⚠️ Note Importanti

- Gli script richiedono la tua API key di Render
- Il service ID deve essere configurato correttamente
- I rollback sono manuali tramite dashboard Render
- I log contengono informazioni diagnostiche dettagliate

## 🆘 Supporto

Per problemi:
1. Controlla i log in `backend/logs/`
2. Usa gli endpoint di diagnostica
3. Analizza i report JSON generati
4. Consulta `DEPLOYMENT_TOOLS.md` per dettagli completi
