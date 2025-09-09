# Operations Guide

This document outlines day-to-day maintenance tasks for MagSuite.

## Backup

Daily backups are scheduled automatically and generate one dump per
tenant under `backend/backups/<company_id>/<YYYY-MM-DD>.dump`.

### Manual Database Backup

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

For a tenant-specific restore:

1. Locate the dump in `backend/backups/<company_id>/<YYYY-MM-DD>.dump`.
2. Restore using the tenant context:

```bash
PGOPTIONS="-c app.current_company_id=<company_id>" pg_restore --no-owner -d magsuite < dumpfile
```

To restore a full database dump:

```bash
psql -U postgres -d magsuite < backup.sql
```

### File Storage

Attachments are encrypted at rest with the key specified in
`FILE_ENCRYPTION_KEY`. Ensure the same key is configured before restoring
files. The key must be provided in Base64 format. You can generate a random
32-byte Base64 key with:

```bash
openssl rand -base64 32
```

To extract a manual archive:

```bash
tar -xzf uploads.tgz -C uploads/
```

## Permission Management

- Gestisci gli utenti dell'applicazione tramite ruoli nel database.
- Genera token JWT per gli utenti amministratori.
- Proteggi le variabili d'ambiente (come `DATABASE_URL`, `ACCESS_SECRET`, `REFRESH_SECRET` e `ALERT_EMAIL`) utilizzando un file `.env` con permessi limitati.

