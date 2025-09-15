# MagSuite – Maintenance Overview

## Infrastruttura
- **Render (Web Service)**
  - Servizio: `MagSuite` (`srv-d2viim8gjchc73b9icgg`)
  - URL: https://magsuite-0wj4.onrender.com
  - Branch: `main`, Runtime: Docker, Health: `/health`
  - Deploy: auto su commit. Strumenti: `@render status|deploy|logs|metrics`

- **Supabase (DB/Postgres)**
  - Project ref: `mojuhmhubjnocogxxwbh`
  - URL: https://mojuhmhubjnocogxxwbh.supabase.co
  - Accesso MCP: `SUPABASE_ACCESS_TOKEN` (utente) + `@supabase/mcp-server-supabase`
  - Multi‑tenant con `company_id` e RLS su tabelle pubbliche

- **TestSprite (MCP Testing/Assist)**
  - Avvio MCP: `npx @testsprite/testsprite-mcp@latest server`
  - Variabile: `API_KEY`
  - Prompt utili: “Analizza questo progetto”, “Genera test per auth”, “Trova bug in ...”

## Backend (Node/Express)
- Entrypoint: `backend/server.js`
- Moduli principali in `backend/src/*` (auth, items, inventory, reports, logs, mrp, ecc.)
- Health/diagnostica: `/health`, `/readyz`, `/health/config`, `/health/diagnostics`
- Script operativi: `backend/scripts/*` (deployment-monitor, deployment-validator, audit-render, audit-supabase)
- Test: Jest in `backend/*.test.js` e `backend/tests/*`

### Variabili d’ambiente critiche
- `DATABASE_URL`, `ACCESS_SECRET`, `REFRESH_SECRET`, `CORS_ORIGIN`
- Opzionali: `REDIS_URL`, `SUPABASE_CA_CERT`, `PG*`, `VAPID_*`, `SENTRY_DSN`

## Database (Supabase)
- Migrazioni: `supabase/migrations/*.sql`
- Tabelle chiave: `companies`, `items`, `inventories`, `import_logs`, `sequences`, `causals`, `stock_movements`, `partners`, `addresses`, `locations`, `transfers`
- Policy RLS basate su `company_id` e `current_setting('app.current_company_id', true)`
- Strumenti verifica: `backend/scripts/audit-supabase.js`

## Frontend (Vue 3 + Vite)
- Entry: `frontend/src/main.ts`, router `frontend/src/router.ts`
- Pagine in `frontend/src/pages/*`, componenti in `frontend/src/components/*`
- Build/serve con Vite; Tailwind per lo stile

## Operazioni comuni
- Verifica servizio: `curl https://magsuite-0wj4.onrender.com/health`
- Verifica Render via MCP: `@render status`, `@render logs`, `@render deployments`
- Validazione deploy: `npm run deploy:validate`
- Audit DB: `node backend/scripts/audit-supabase.js`

## Note e raccomandazioni
- Mantenere le variabili sensibili fuori dal repo (usa env). I file MCP usano placeholder `${...}`.
- Aggiungere test FE (unit/snapshot) e smoke E2E essenziali.
- Monitorare indici e performance su `stock_movements` e report pesanti.
- In caso di problemi DB/RLS, consultare `DATABASE_INDEXES_FIX.md` e `COMPREHENSIVE_VERIFICATION_REPORT.md`.

