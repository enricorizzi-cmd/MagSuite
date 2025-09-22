# Business Planning (BP) Module

This document summarises the configuration required for the new BP module.

## Backend

- `bpModule` initialisation happens automatically in `backend/server.js`.
- HTTP endpoints are served under `/bp/*` and share the standard auth middleware.
- Postgres tables live in the `bp_*` namespace; migrations are tracked in `supabase/migrations`.

### Environment variables

| Variable | Description |
| --- | --- |
| `VAPID_PUBLIC_KEY` | Public VAPID key used for web push subscriptions. |
| `VAPID_PRIVATE_KEY` | Private VAPID key used for web push signing. |
| `VAPID_SUBJECT` | Mailto/URL contact exposed to push subscribers. |
| `FEATURE_BP_MODULE` (optional) | Gate to toggle the BP module visibility in production deployments. |

All values should be injected into the backend runtime. In local development add them to `backend/.env`.

### Data import / migration

A new helper script imports data exported from the legacy BPApp archive:

```bash
# Dry run (no writes)
node scripts/import-bpapp.js --data-dir BPApp_extracted/BPApp/backend/data --dry-run

# Actual import for company 1 (default)
node scripts/import-bpapp.js --data-dir BPApp_extracted/BPApp/backend/data

# Import into a different company and wipe current BP data first
node scripts/import-bpapp.js --company 2 --truncate --data-dir /path/to/data
```

The script expects:

1. Users in the backup to be matched by email with MagSuite users.
2. Customers to already exist inside MagSuite Anagrafiche.
3. JSON files placed in `BPApp_extracted/BPApp/backend/data` (default extracted archive path).

The command provides summary stats for clients, appointments, sales, periods and applies settings/recipients.

> **Important:** run the script with the desired `NODE_ENV` and database credentials loaded so it connects to the correct Postgres instance.

### Testing

A dedicated Jest suite (`backend/bp.test.js`) covers the main flows (clients, appointments, sales, leaderboard, settings).

## Frontend

- BP routes sit under `/direzione-commerciale/*` using nested routing (`frontend/src/router.ts`).
- Pinia store lives in `frontend/src/stores/bp.ts` and centralises API calls/state.
- Vue components for BP views are in `frontend/src/pages/direzione-commerciale/components/`.
- Typed API helpers reside in `frontend/src/services/bp.ts`.

### UI testing

A lightweight Pinia unit test (`frontend/tests/bp-store.spec.ts`) stubs API calls and validates store behaviour. Run it with:

```bash
npm run test:ui
```

### Shared data

- BP clients are linked to the single source of truth in Anagrafiche (`customers` table). The frontend components expose links back to `/anagrafiche/clienti` instead of duplicating data.
- BP Users map onto MagSuite users; consultant data reuses existing user records.

## Import/export recap

1. Extract the legacy `BPApp.zip` into `BPApp_extracted/BPApp/` (already ignored by git).
2. Adjust `.env` for VAPID keys and feature flags if required.
3. Run the import script (dry-run suggested first) to seed BP data.
4. Run Jest/Vitest suites for backend and frontend modules.
5. Deploy as usual; the `/direzione-commerciale` section now surfaces the BP dashboards, agenda, periods, clients, sales, team, and settings.
