# MagSuite Deployment Tools

Questo set di strumenti ti aiuta a monitorare, validare e gestire i deployment su Render in modo automatico.

## 🚀 Script Disponibili

### 1. Deployment Monitor (`deploy:monitor`)
Monitora la salute del deployment locale e identifica problemi comuni.

```bash
npm run deploy:monitor
```

**Cosa fa:**
- Verifica la connessione al database
- Controlla Redis (se configurato)
- Valida le variabili d'ambiente
- Controlla lo spazio su disco
- Verifica la disponibilità delle porte
- Esegue le migrazioni se necessario

### 2. Render Helper (`deploy:render`)
Analizza lo stato del servizio su Render e genera report dettagliati.

```bash
npm run deploy:render
```

**Cosa fa:**
- Controlla lo stato del servizio Render
- Analizza i deployment recenti
- Identifica deployment falliti
- Verifica le variabili d'ambiente su Render
- Genera raccomandazioni per il fix

### 3. Deployment Validator (`deploy:validate`)
Valida la salute del deployment dopo il deploy e suggerisce azioni.

```bash
npm run deploy:validate
```

**Cosa fa:**
- Testa gli endpoint `/health`, `/readyz`, `/health/diagnostics`
- Analizza lo stato del servizio Render
- Identifica problemi critici
- Suggerisce rollback se necessario

### 4. Rollback Helper (`deploy:rollback`)
Analizza se è necessario un rollback e fornisce istruzioni per eseguirlo.

```bash
npm run deploy:rollback
```

**Cosa fa:**
- Analizza la salute dei deployment recenti
- Identifica l'ultimo deployment di successo
- Determina se è necessario un rollback
- Fornisce istruzioni per il rollback manuale

## ⚙️ Configurazione

### 1. Copia il file di configurazione
```bash
cp deploy-config.example .env.deploy
```

### 2. Modifica `.env.deploy` con i tuoi valori:
```bash
RENDER_API_KEY=<RENDER_API_KEY>
RENDER_SERVICE_ID=il-tuo-service-id
APP_BASE_URL=https://la-tua-app.onrender.com
```

### 3. Carica le variabili d'ambiente:
```bash
source .env.deploy
```

## 🔧 Endpoint di Health Check

Il server ora include endpoint migliorati per il monitoraggio:

### `/health`
Endpoint principale di salute del servizio.

### `/readyz`
Endpoint di readiness per Kubernetes/Render.

### `/health/config`
Informazioni di configurazione (non sensibili).

### `/health/diagnostics`
Diagnostica dettagliata con raccomandazioni.

## 📊 Report e Log

Tutti gli script generano report dettagliati in:
- `logs/deployment-monitor.log`
- `logs/deployment-report.json`
- `logs/render-deployment-report.json`
- `logs/deployment-validation-report.json`
- `logs/rollback-report.json`

## 🚨 Workflow di Troubleshooting

### 1. Problema di Deployment
```bash
# Controlla lo stato generale
npm run deploy:render

# Valida il deployment
npm run deploy:validate

# Se necessario, analizza rollback
npm run deploy:rollback
```

### 2. Problema Locale
```bash
# Monitora la salute locale
npm run deploy:monitor
```

### 3. Debug Dettagliato
```bash
# Controlla gli endpoint di diagnostica
curl https://your-app.onrender.com/health/diagnostics
```

## 🔄 Automazione

### Cron Job per Monitoraggio Continuo
```bash
# Aggiungi al crontab per monitoraggio ogni 5 minuti
*/5 * * * * cd /path/to/magsuite/backend && npm run deploy:validate
```

### Webhook per Notifiche
Gli script possono essere estesi per inviare notifiche via:
- Slack
- Discord
- Email
- SMS

## 🛠️ Risoluzione Problemi Comuni

### Database Connection Failed
- Verifica `DATABASE_URL`
- Controlla certificati SSL
- Verifica firewall/network

### Redis Connection Failed
- Redis è opzionale, il servizio continua senza cache
- Verifica `REDIS_URL` se necessario

### Environment Variables Missing
- Controlla tutte le variabili richieste
- Verifica la configurazione su Render

### Service Not Live
- Controlla i log di deployment su Render
- Verifica le risorse del servizio
- Controlla i limiti di banda/memoria

## 📈 Monitoraggio Proattivo

### Health Check Continuo
```bash
# Script per monitoraggio continuo
while true; do
  npm run deploy:validate
  sleep 300  # 5 minuti
done
```

### Alerting Automatico
Gli script possono essere configurati per inviare alert quando:
- Il servizio non è live
- Ci sono errori critici
- I deployment falliscono
- Le performance degradano

## 🔐 Sicurezza

- Le API key sono gestite tramite variabili d'ambiente
- I report non contengono informazioni sensibili
- Gli endpoint di diagnostica sono sicuri per uso pubblico

## 📞 Supporto

Per problemi o domande:
1. Controlla i log generati dagli script
2. Usa gli endpoint di diagnostica
3. Analizza i report JSON per dettagli tecnici
4. Consulta la documentazione di Render per problemi specifici della piattaforma
