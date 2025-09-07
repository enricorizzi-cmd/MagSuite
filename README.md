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
node server.js
# Optional: start local Supabase instance
supabase start
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

To run services manually without containers:

```bash
cd backend && node server.js
cd ../frontend && npm run dev
```

## Usage

Start the backend server:

```bash
cd backend
node server.js
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

