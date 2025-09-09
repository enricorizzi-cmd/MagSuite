# Decision Log: Multi-Tenant Architecture

## Backend Framework

### Options Evaluated
- **NestJS (Node.js/TypeScript)** – Modular structure and decorators simplify per-tenant modules; libraries like `@nestjs/tenant` offer first-class multi-tenant support.
- **Django (Python)** – Mature ORM and packages such as `django-tenants` enable schema or database isolation.
- **Spring Boot (Java)** – Strong enterprise tooling with built-in strategies for schema or database separation.

### Decision
**NestJS** was selected. Its TypeScript foundation aligns with existing JavaScript expertise and integrates with npm ecosystem. The framework's dependency injection and module system make tenant-aware services easy to compose, while community libraries provide reusable multi-tenant patterns.

## Frontend Framework

### Options Evaluated
- **Vue 3 with Vite** – Lightweight, reactive components and official router/state libraries. Route guards and store namespaces can segregate tenant context.
- **Next.js (React)** – File-based routing and middleware support subdomain-based tenant resolution, but requires React adoption.
- **Angular** – Comprehensive tooling but heavier learning curve and bundle size.

### Decision
**Vue 3 with Vite** was chosen. It keeps the current stack, has small runtime overhead, and its routing and state management tools allow injecting tenant-specific data or themes at runtime without complex rewrites.

## Data, Storage, and Authentication

### Database
Adopt **PostgreSQL** via **Supabase**. PostgreSQL's schemas and Row Level Security enable isolating tenant data, while Supabase automates migrations and provides an SQL interface.

### File Storage
Use **Supabase Storage** (S3-compatible). Bucket-level security policies allow per-tenant file isolation with minimal configuration.

### Authentication
Employ **Supabase Auth**. It offers hosted OAuth providers and JWT issuance; custom claims can carry tenant identifiers for backend authorization checks.

## Summary
This stack leverages a TypeScript backend (NestJS) and a Vue 3 frontend, both capable of injecting tenant context. Supabase consolidates database, storage, and authentication, reducing operational overhead while providing primitives for strict tenant isolation.

