# Mandatory Deployment Workflow

Questa regola e vincolante per ogni attivita:

> "Ad ogni modifica al termine fai commit e push in autonomia, poi ti colleghi a Render e con timeout ripetitivi ogni 15 secondi verifichi il log finche il servizio non va live. Se ha errori prendi e rilevi gli errori, li correggi, rifai commit e push e verifichi nuovamente il deploy. Ogni attivita puo finire solo con la conclusione deploy ok e servizio live!"

## Sequenza operativa

1. Completa lo sviluppo e verifica in locale.
2. `git add`, `git commit`, `git push` (nessuna eccezione).
3. Avvia o controlla il deploy su Render (`@render deploy magsuite-backend` oppure push su branch monitorato).
4. Esegui `node scripts/render-monitor.js` (richiede `RENDER_API_KEY` e `RENDER_SERVICE_ID`) per controllare ad intervalli di 15 secondi:
   - Lo script usa `GET /services/{SERVICE_ID}/deploys` e `GET /logs` (Render API) per tracciare lo stato.
   - Si chiude con exit 0 solo quando lo stato e `live`; termina con exit code diverso da 0 se il deploy fallisce.
5. Se compaiono errori nei log o il deploy fallisce:
   - Analizza i log mostrati dallo script.
   - Correggi il problema in codice o configurazione.
   - Ripeti dal punto 1 finche il deploy non e live.

## Dati di configurazione salvati

- **Render MCP server**: `https://mcp.render.com/mcp` (vedi `backend/MCP_USAGE_GUIDE.md` per dettagli completi su setup e comandi Cursor).
- **Env obbligatorie**:
  - `RENDER_API_KEY` (creata da Render -> Account -> API Keys, prefisso `rnd_`).
  - `RENDER_SERVICE_ID` (identificatore `srv-...` del servizio `magsuite-backend`).
  - Opzionali per lo script: `RENDER_MONITOR_INTERVAL_MS` (default 15000) e `RENDER_MONITOR_LOG_WINDOW_MIN` (default 15).
- **Script monitoraggio**: `scripts/render-monitor.js` (Node 18+). Consigliato integrarlo in automazioni post-push.
- **Documentazione correlata**:
  - `README.md` -> sezione "Render MCP monitoring" (come lanciare lo script).
  - `backend/MCP_USAGE_GUIDE.md` -> guida completa MCP/Render.

Questo file e la fonte primaria da consultare prima di pianificare qualsiasi attivita.
