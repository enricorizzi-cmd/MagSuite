# MagSuite – Inventario Dati e Regole di Persistenza

Obiettivo: avere una singola fonte di verità per ogni entità, evitare duplicati (es. un secondo `users` in memoria) e garantire multi‑tenant e sicurezza consistenti.

## Principi

- Persistenza unica: tutte le entità di dominio vivono in Postgres (Supabase). Niente array o Map in memoria come archiviazione permanente.
- Multi‑tenant: le tabelle aziendali includono `company_id` con default `current_setting('app.current_company_id')::int`; le query filtrano per azienda o si appoggiano al default.
- Migrazioni prima: preferire migrazioni in `supabase/migrations/` per nuovi schemi; l’uso di `CREATE TABLE IF NOT EXISTS` a runtime deve essere allineato a questo documento.
- Sicurezza: ove previsto, RLS con policy su `company_id` (già in migrazioni per `items`, `sequences`, `causals`, `partners`, `addresses`).
- Ephemeral consentiti: solo cache/registry in memoria (job queues, client SSE, registri plugin) — non dati di dominio.

## Stato in Memoria (consentito)

- `backend/server.js`: `jobQueue` – coda effimera per job UI.
- `backend/src/notifications.js`: `clients: Map` – connessioni SSE per notifiche.
- `backend/src/integrations/index.js`: `plugins: Map`, `schedules: Map` – registry plugin e scheduler.
- `backend/src/db/index.js`: `AsyncLocalStorage` + `settings: Map` – contesto sessione per `current_setting`; solo per pg‑mem/tests.

## Identità e Autorizzazioni

- `users` (persistente): backend/src/auth/users.js
  - Campi: `email`, `password_hash`, `role_id`, `warehouse_id`, `company_id`, `last_login`, `mfa_secret`.
  - Ruolo tramite `roles.name` (FK `role_id`).
  - Token include: `id`, `role`, `warehouse_id`, `company_id`, `permissions`.
  - Nota: `permissions` applicative sono nel token, non in DB.

- `roles`, `permissions` (persistenti): supabase/migrations/20240515120000_create_auth_tables.sql
  - Oggi `permissions` tabellare è placeholder; l’RBAC effettivo è in `backend/src/auth/middleware.js`.

- `user_settings` (persistente, distinta da auth): backend/src/users.js
  - Campi: `name`, `role`, `warehouse_id`, `company_id`.
  - Uso: preferenze/app‑level per l’azienda. Non è un duplicato di `users`.

## Aziende e Configurazioni

- `companies` (persistente): definita sia in migrazioni sia garantita a runtime (auth/routes).
  - Unique case‑insensitive su `name`.
- `company_settings` (persistente): backend/server.js
  - `company_id` PK, `settings` JSONB – configurazioni per UI e funzioni.

## Dati Core e Movimenti

- `warehouses`: backend/src/warehouses.js – multiazienda.
- `items`: backend/src/items.js – multiazienda, molte colonne applicative, `item_views` per viste salvate.
- `documents`, `document_lines` (migrazione), ma a runtime `documents` è gestita come JSONB lines; `stock_movements`, `lots`, `serials` in backend/src/documents.js – tutte multiazienda.
- `inventories`: backend/src/inventories.js – multiazienda.
- `sequences`, `causals`: migrazione + backend/src/sequences.js, backend/src/causals.js – multiazienda, vincoli univoci per azienda.
- `locations`, `transfers`: migrazioni e backend/src/locations.js, backend/src/transfers.js – multiazienda.
- `price_lists`, `item_prices`: backend/src/priceLists.js – multiazienda, prezzi per listino/articolo.

## Partner/Anagrafiche

- `partners`, `addresses`: supabase/migrations/20240717000000_create_partner_tables.sql – multiazienda (consigliato come target unico per clienti/fornitori).
- `customers`, `suppliers` (legacy): backend/src/customers.js, backend/src/suppliers.js
  - Attuali tabelle semplici senza `company_id`.
  - Piano: migrare su `partners` (con attributo/ruolo `type = 'customer' | 'supplier'`) ed eliminare queste tabelle per evitare duplicati.

## Import/Export, Report e Integrazioni

- `import_logs`, `import_templates`: backend/src/imports.js – multiazienda.
- `report_views`, `report_schedules`: backend/server.js – pianificazione e salvataggio viste.
- `connectors`, `connector_jobs`: backend/server.js e backend/src/integrations/index.js – multiazienda, log job integrazioni.

## Log applicativi

- `audit.log` su filesystem (backend/src/audit.js, backend/src/logs.js). Non in DB.

## Zone di Attenzione (rischio duplicati o inconsistenze)

- `users` vs `user_settings`: scopi diversi. Non creare una seconda tabella utenti; per autenticazione usare sempre `users`.
- `customers`/`suppliers` vs `partners`: unificare su `partners` e segnare come deprecate le prime due tabelle.
- Definizioni duplicate `companies`: esistono sia nelle migrazioni sia come safeguard runtime (auth/routes). Va bene, ma mantenere lo schema coeso alle migrazioni.

## Checklist per Nuove Feature (anti‑duplicati)

- Persistenza:
  - Usare DB per ogni entità di dominio; nessun array/Map come storage duraturo.
  - Aggiornare questo documento quando si introduce una nuova tabella.
- Multi‑tenant:
  - Aggiungere `company_id` con default `current_setting('app.current_company_id')`.
  - Applicare filtri per `company_id` in tutte le query e/o policy RLS.
- Migrazioni:
  - Aggiungere migrazione in `supabase/migrations/` (preferito), oppure assicurarsi che l’`ensureReady` runtime sia idempotente e documentato qui.
- Ruoli/Autorizzazioni:
  - Se aggiungi un ruolo, inseriscilo in `roles` e aggiorna la mappa RBAC in `backend/src/auth/middleware.js`.
- Nomenclatura:
  - Evitare nomi ambigui che suggeriscono la stessa entità (es. non creare `app_users` se esiste `users`).

## Roadmap Pulizia

- Migrare `customers` e `suppliers` in `partners` con tipo/ruolo e rimuovere le tabelle legacy.
- Spostare eventuali `CREATE TABLE IF NOT EXISTS` critici in migrazioni per avere un’unica storia schema.

## Verifiche Automatiche (suggerimenti)

- Test/lint di controllo che fallisce se in `backend/src/` compaiono pattern di archiviazione in memoria per entità (`const .* = \[\]` vicino a route CRUD).
- Test di smoke per controllare che tutte le query di elenco filtrino per `company_id` dove previsto.

