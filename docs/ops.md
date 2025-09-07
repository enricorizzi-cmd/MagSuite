# Operations Guide

This document outlines day-to-day maintenance tasks for MagSuite.

## Backup

### Database

Create a dump of the PostgreSQL database:

```bash
pg_dump -U postgres -d magsuite > backup.sql
```

### File Storage

Archive uploaded documents or images:

```bash
tar -czf uploads.tgz uploads/
```

## Restore

### Database

```bash
psql -U postgres -d magsuite < backup.sql
```

### File Storage

```bash
tar -xzf uploads.tgz -C uploads/
```

## Permission Management

- Gestisci gli utenti dell'applicazione tramite ruoli nel database.
- Genera token JWT per gli utenti amministratori.
- Proteggi le variabili d'ambiente (come `DATABASE_URL` e `ALERT_EMAIL`) utilizzando un file `.env` con permessi limitati.

