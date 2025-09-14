# MagSuite

[![Backend CI](https://github.com/example/MagSuite/actions/workflows/ci.yml/badge.svg?job=backend)](https://github.com/example/MagSuite/actions/workflows/ci.yml)
[![Frontend CI](https://github.com/example/MagSuite/actions/workflows/ci.yml/badge.svg?job=frontend)](https://github.com/example/MagSuite/actions/workflows/ci.yml)

MagSuite — Giacenze chiare, scorte giuste, meno sprechi.

## Project Overview

MagSuite is a lightweight toolkit aimed at helping small businesses keep their stock levels under control and reduce waste. The project is currently in active development.

## Features

- Inventory tracking with clear stock insights
- Simple analytics to highlight slow-moving items
- Modular architecture for future integrations

## Repository Structure

- [backend](backend/) – Node.js server placeholder
- [frontend](frontend/) – Vite app scaffold
- [supabase](supabase/) – Supabase configuration and migrations

## Prerequisites

- Python 3.8 or later
- Node.js 20 or later
- npm or pnpm
- Supabase CLI
- Docker and Docker Compose
- Git

## Environment Setup

### Python

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

### Node

Install project dependencies for both services:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Supabase

```bash
supabase login   # authenticate the CLI
supabase start   # start local services
```

#### Supabase Audit (DB & RLS)

A utility is provided to audit your Supabase/Postgres configuration against the repository migrations (RLS, policies, indexes, constraints, and migration drift).

- Prerequisites: set a valid `DATABASE_URL` (or `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`). For Supabase, set `PGSSLMODE=require`. If your project requires a custom CA, set `DB_CA_PATH` to the certificate path (optionally `NODE_EXTRA_CA_CERTS` too).

Run the audit:

```bash
cd backend
# Option A: using env file
node --env-file=.env scripts/audit-supabase.js
# Option B: directly via npm script (expects env already set in the shell)
DATABASE_URL=postgres://... PGSSLMODE=require npm run audit:supabase
```

The report lists:
- Tables with RLS disabled
- Policies defined on public tables
- Expected RLS tables status (items, sequences, causals, partners, addresses)
- company_id nullability and default expressions
- Indexes on stock_movements
- Migration drift (local files vs applied in DB)

## Node Dependencies

Both the backend and frontend include dependencies managed via their own `package.json` files. Install with `npm ci` inside each folder. See `backend/package.json` and `frontend/package.json` for details.

## Installation

Clone the repository and move into the project directory:

```bash
git clone https://github.com/example/MagSuite.git
cd MagSuite
```

### Backend setup

```bash
cd backend
npm install # installs dependencies from package.json
npm start
# Optional: start local Supabase instance
supabase start
```

#### Environment variables

The backend relies on a few variables at runtime:

- `DATABASE_URL` – PostgreSQL connection string
- `ACCESS_SECRET` – secret used to sign access tokens (required)
- `REFRESH_SECRET` – secret used to sign refresh tokens (required)
- `API_KEY` – API key used for external integrations (required)
- `SSO_SECRET` – secret used to validate SSO tokens (required)
- `FILE_ENCRYPTION_KEY` – key used to encrypt stored files (required)
- `ALERT_EMAIL` – destination for alert notifications (optional)
- `BATCH_STRATEGY` – `FIFO` (default) or `FEFO` for batch handling (optional)
- `DB_CA_PATH` – path to the CA certificate used to verify the database TLS connection
- `NODE_EXTRA_CA_CERTS` – optional, adds the same CA to Node's global trust store
- `SUPABASE_URL` – Supabase project URL
- `SUPABASE_ANON_KEY` – public Supabase key (server-side only if needed)
- `SUPABASE_SERVICE_ROLE` – service-role key for privileged Supabase operations
- `VAPID_PUBLIC` / `VAPID_PRIVATE` – VAPID keys for Web Push
- `SENTRY_DSN` – Sentry project DSN for error tracking
- `CORS_ORIGIN` – comma-separated list of allowed origins

On Render, add them via **Environment → Add Environment Variable**:

```
DATABASE_URL=postgres://user:pass@db:5432/magsuite
ACCESS_SECRET=replace-me
REFRESH_SECRET=replace-me-too
API_KEY=replace-me-api-key
SSO_SECRET=replace-me-sso-secret
FILE_ENCRYPTION_KEY=replace-me-file-key
ALERT_EMAIL=alerts@example.com
BATCH_STRATEGY=FIFO
DB_CA_PATH=/etc/secrets/supabase-ca.crt
# Alternatively supply the certificate via base64
# DB_CA_CERT_B64=$(base64 -w0 supabase-ca.crt)
# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=replace-me
SUPABASE_SERVICE_ROLE=replace-me
# Web Push
VAPID_PUBLIC=replace-me
VAPID_PRIVATE=replace-me
# Observability & security
SENTRY_DSN=https://example.ingest.sentry.io/project
CORS_ORIGIN=https://example.com
# Optional: extend Node's global trust store
NODE_EXTRA_CA_CERTS=/etc/secrets/supabase-ca.crt
```

Store the CA certificate in your deployment platform's secret manager (e.g., GitHub
Secrets) and write it to the location referenced by `DB_CA_PATH` at runtime.

For local development, create a `.env` file inside `backend/` (or use a root `.env`) and run Node with the
[`--env-file`](https://nodejs.org/api/cli.html#--env-file) flag:

```bash
cd backend
cat <<'EOF' > .env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/magsuite
ACCESS_SECRET=dev-access-secret
REFRESH_SECRET=dev-refresh-secret
API_KEY=dev-api-key
SSO_SECRET=dev-sso-secret
FILE_ENCRYPTION_KEY=dev-file-key
ALERT_EMAIL=alerts@example.com
BATCH_STRATEGY=FIFO
# Uncomment if you have a custom CA certificate locally
# DB_CA_PATH=/path/to/ca.crt
EOF
node --env-file=.env server.js

Important: never commit real secrets. `.env` files are ignored by Git and a `.env.example` is provided as a template.
```

### Frontend setup

```bash
cd frontend
pnpm install # or npm install (installs package.json dependencies)
pnpm dev     # or npm run dev
```

#### Environment variables

The frontend can be pointed at a different backend by setting `VITE_API_URL`.
If omitted, API calls default to the same origin that serves the built app.
To authenticate requests without a JWT, provide `VITE_API_KEY` and
`VITE_COMPANY_ID`; these are sent as `x-api-key` and `x-company-id`
headers on every request.

## Build

Create production-ready artifacts using Docker or Vite:

```bash
docker-compose build
# or build the frontend bundle alone
cd frontend && npx vite build
```

## Deployment

Launch the entire stack with Docker Compose:

```bash
docker-compose up --build
```

To run services manually without containers during local development, start both servers with:

```bash
./start.sh
```

This helper script is intended for local development only.

If you prefer to run them separately:

```bash
cd backend && npm start
cd ../frontend && npm run dev
```

### Render

Deploy on [Render](https://render.com) using **two services**.

#### Backend (Node)

- **Dockerfile path:** `backend/Dockerfile` (build context = repo root)
- **Health check path:** `/health`
- **Environment variables:** `DATABASE_URL`, `ACCESS_SECRET`, `REFRESH_SECRET`, `SSO_SECRET`, `API_KEY`, `FILE_ENCRYPTION_KEY`, `ALERT_EMAIL` (optional), `BATCH_STRATEGY` (optional), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`, `VAPID_PUBLIC`, `VAPID_PRIVATE`, `SENTRY_DSN`, `CORS_ORIGIN`, `DB_CA_CERT_B64` (base64 CA for Supabase pool), `DB_CA_PATH` / `NODE_EXTRA_CA_CERTS` if you mount a cert file. Missing the CA results in `SELF_SIGNED_CERT_IN_CHAIN` during migrations.

#### Frontend (static)

- **Build command:** `cd frontend && npm ci && npm run build`
- **Publish directory:** `frontend/dist`
- **Environment variables:** `VITE_API_URL`, `VAPID_PUBLIC`, `SENTRY_DSN` (optional)

- **Blueprint (optional):** the included `render.yaml` defines both services. Import it via Render → New + → Blueprint from Repo and fill secrets after import.

To audit a deployed service with Render API, create a Personal Access Token in Render (Account → API Keys) and run:

```bash
cd backend
setx RENDER_API_TOKEN <your_pat>
setx RENDER_SERVICE_ID <service_id>
npm run audit:render
```

At runtime, a non‑sensitive config check is available at `/health/config` (only flags, no secret values).

## Usage

Start the backend server:

```bash
cd backend
npm start
```

In another terminal, start the frontend development server:

```bash
cd frontend
npm run dev
```

A lightweight Python CLI is available for quick inventory summaries:

```bash
magsuite --inventory docs/sample_inventory.csv
```

For more examples, see the [usage guide](docs/usage.md).

## Contribution Guidelines

Contributions are welcome! Please follow the basics below and see the [full guide](docs/contributing.md) for details.

1. Fork the repository and create a feature branch.
2. Commit changes with clear messages.
3. Open a pull request.

## Team Guide

For details on the branching policy, environments and CI/CD workflow, see the [team guide](docs/team-guide.md).

## License

MagSuite is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

