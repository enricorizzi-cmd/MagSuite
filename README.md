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

## Node Dependencies

Both the backend and frontend currently have no external Node.js packages.
Dependencies will be listed in their respective `package.json` files as the project grows.

## Installation

Clone the repository and move into the project directory:

```bash
git clone https://github.com/example/MagSuite.git
cd MagSuite
```

### Backend setup

```bash
cd backend
npm install # installs dependencies from package.json (none currently)
npm start
# Optional: start local Supabase instance
supabase start
```

#### Environment variables

The backend relies on a few variables at runtime:

- `DATABASE_URL` – PostgreSQL connection string
- `ACCESS_SECRET` – secret used to sign access tokens (required)
- `REFRESH_SECRET` – secret used to sign refresh tokens (required)
- `ALERT_EMAIL` – destination for alert notifications (optional)
- `BATCH_STRATEGY` – `FIFO` (default) or `FEFO` for batch handling (optional)
- `DB_CA_PATH` – path to the CA certificate used to verify the database TLS connection
- `NODE_EXTRA_CA_CERTS` – optional, adds the same CA to Node's global trust store

On Render, add them via **Environment → Add Environment Variable**:

```
DATABASE_URL=postgres://user:pass@db:5432/magsuite
ACCESS_SECRET=replace-me
REFRESH_SECRET=replace-me-too
ALERT_EMAIL=alerts@example.com
BATCH_STRATEGY=FIFO
DB_CA_PATH=/etc/secrets/supabase-ca.crt
# Optional: extend Node's global trust store
NODE_EXTRA_CA_CERTS=/etc/secrets/supabase-ca.crt
```

Store the CA certificate in your deployment platform's secret manager (e.g., GitHub
Secrets) and write it to the location referenced by `DB_CA_PATH` at runtime.

For local development, create a `.env` file inside `backend/` and run Node with the
[`--env-file`](https://nodejs.org/api/cli.html#--env-file) flag:

```bash
cd backend
cat <<'EOF' > .env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/magsuite
ACCESS_SECRET=dev-access-secret
REFRESH_SECRET=dev-refresh-secret
ALERT_EMAIL=alerts@example.com
BATCH_STRATEGY=FIFO
# Uncomment if you have a custom CA certificate locally
# DB_CA_PATH=/path/to/ca.crt
EOF
node --env-file=.env server.js
```

### Frontend setup

```bash
cd frontend
pnpm install # or npm install (installs package.json dependencies)
pnpm dev     # or npm run dev
```

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

To run services manually without containers, start both servers with:

```bash
./start.sh
```

If you prefer to run them separately:

```bash
cd backend && npm start
cd ../frontend && npm run dev
```

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

## License

MagSuite is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

