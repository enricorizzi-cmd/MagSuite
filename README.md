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

- Node.js 20 or later
- npm or pnpm
- Supabase CLI
- Git

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

