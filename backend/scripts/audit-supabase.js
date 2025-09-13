/*
  Audit Supabase/Postgres configuration for MagSuite
  - Connects via env (DATABASE_URL or PG* vars)
  - Verifies RLS and policies on multi-tenant tables
  - Checks indexes and constraints
  - Compares applied migrations with files in supabase/migrations

  Usage:
    # From repo root or backend/
    # Ensure env has at least DATABASE_URL (or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE)
    # For Supabase, set PGSSLMODE=require and provide CA via DB_CA_PATH if needed
    node backend/scripts/audit-supabase.js
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Try to load .env if present (repo root or backend folder)
try {
  const dotenv = require('dotenv');
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];
  for (const p of envCandidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
} catch (_) {
  // dotenv optional
}

function buildClientConfig() {
  const connectionString = process.env.DATABASE_URL;

  // Resolve CA: prefer SUPABASE_CA_CERT (env), then DB_CA_PATH, then repo root supabase-ca.crt
  let ca;
  const envCaRaw = process.env.SUPABASE_CA_CERT && process.env.SUPABASE_CA_CERT.trim();
  if (envCaRaw) {
    try {
      if (envCaRaw.includes('-----BEGIN CERTIFICATE-----')) {
        ca = envCaRaw;
      } else {
        ca = Buffer.from(envCaRaw, 'base64').toString('utf8');
      }
    } catch (_) {
      // ignore and fall back
    }
  }
  if (!ca) {
    const explicitCaPath = process.env.DB_CA_PATH;
    const repoCaPath = path.resolve(__dirname, '..', '..', 'supabase-ca.crt');
    const defaultCaPath = explicitCaPath || (fs.existsSync(repoCaPath) ? repoCaPath : undefined);
    if (defaultCaPath) {
      try {
        ca = fs.readFileSync(defaultCaPath, 'utf8');
      } catch (_) {
        // ignore
      }
    }
  }

  const base = connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      };

  const sslMode = (process.env.PGSSLMODE || 'require').toLowerCase();
  const useSSL = sslMode !== 'disable';
  const allowInvalid = (process.env.PGSSL_NO_VERIFY === 'true') || sslMode === 'no-verify';
  const ssl = useSSL
    ? {
        ca: allowInvalid ? undefined : ca,
        rejectUnauthorized: !allowInvalid,
        minVersion: 'TLSv1.2',
      }
    : false;

  if (allowInvalid) {
    console.warn('[WARN] SSL verification disabled (no-verify). Use only for local audit.');
  } else if (useSSL && !ca) {
    console.warn('[INFO] No custom CA provided. If using Supabase pooling (port 6543), set DB_CA_PATH or SUPABASE_CA_CERT.');
  }

  return {
    ...base,
    ssl,
    keepAlive: true,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
  };
}

async function runQuery(client, text, params) {
  try {
    const res = await client.query(text, params);
    return res.rows;
  } catch (err) {
    return { __error: true, message: err.message, code: err.code };
  }
}

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printRows(rows, emptyMsg = 'No rows') {
  if (!rows || rows.length === 0) {
    console.log(emptyMsg);
    return;
  }
  // Pretty-print as aligned key: value per row
  const keys = Object.keys(rows[0] || {});
  for (const r of rows) {
    const parts = [];
    for (const k of keys) {
      parts.push(`${k}=${r[k]}`);
    }
    console.log('- ' + parts.join(' | '));
  }
}

async function detectMigrationTable(client) {
  // Try public.schema_migrations (custom runner in this repo)
  let exists = await runQuery(
    client,
    "select 1 from information_schema.tables where table_schema='public' and table_name='schema_migrations'"
  );
  if (!exists.__error && exists.length > 0) {
    return { schema: 'public', table: 'schema_migrations', style: 'public-filename' };
  }
  // Try supabase_migrations.schema_migrations (Supabase CLI)
  exists = await runQuery(
    client,
    "select 1 from information_schema.tables where table_schema='supabase_migrations' and table_name='schema_migrations'"
  );
  if (!exists.__error && exists.length > 0) {
    // Infer columns
    const sample = await runQuery(
      client,
      'select * from supabase_migrations.schema_migrations limit 1'
    );
    if (!sample.__error && sample.length > 0) {
      const cols = Object.keys(sample[0]);
      // Supabase often has version (bigint) and name (text)
      const hasName = cols.includes('name');
      const hasVersion = cols.includes('version');
      return {
        schema: 'supabase_migrations',
        table: 'schema_migrations',
        style: hasName && hasVersion ? 'supabase-version-name' : 'supabase-generic',
      };
    }
    return { schema: 'supabase_migrations', table: 'schema_migrations', style: 'supabase-generic' };
  }
  return null;
}

function loadLocalMigrationFiles() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'supabase', 'migrations'),
    path.resolve(__dirname, '..', 'supabase', 'migrations'),
  ];
  let dir = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      dir = c; break;
    }
  }
  if (!dir) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files;
}

async function main() {
  // Basic env checks
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    console.error('Missing DATABASE_URL or PG* env vars. Configure connection and retry.');
    process.exit(2);
  }

  const client = new Client(buildClientConfig());
  await client.connect();

  try {
    printSection('Connection');
    const info = await runQuery(
      client,
      `select version(), current_user, current_database(), current_schemas(true) as schemas`
    );
    printRows(info);

    // Tables & RLS status
    printSection('Public tables and RLS');
    const rls = await runQuery(
      client,
      `select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where c.relkind='r' and n.nspname='public' order by 1,2`
    );
    printRows(rls, 'No public tables');

    printSection('RLS disabled (if any)');
    const rlsOff = (rls.__error ? [] : rls.filter((r) => r.rls_enabled === false));
    printRows(rlsOff, 'All tables have RLS enabled or no tables');

    // Policies
    printSection('Policies (public.*)');
    const policies = await runQuery(
      client,
      `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
       from pg_policies where schemaname='public' order by tablename, cmd, policyname`
    );
    printRows(policies, 'No policies found');

    // Expected RLS tables
    const expectedTables = ['items','sequences','causals','partners','addresses'];
    const valuesList = expectedTables.map(t => `('${t}')`).join(',');
    const expectedStatus = await runQuery(
      client,
      `with expected(tablename) as (values ${valuesList})
       select e.tablename,
              case when c.oid is null or n.nspname <> 'public' then 'MISSING_TABLE'
                   when c.relrowsecurity=false then 'RLS_DISABLED'
                   else 'OK' end as status
       from expected e
       left join pg_class c on c.relname=e.tablename
       left join pg_namespace n on n.oid=c.relnamespace
       order by 1`
    );
    printRows(expectedStatus);

    // company_id column checks
    printSection('company_id columns (nullable/default)');
    const companyCols = await runQuery(
      client,
      `select table_name, is_nullable, column_default
         from information_schema.columns
        where table_schema='public' and column_name='company_id'
          and table_name in ('items','sequences','causals','partners','addresses')
        order by table_name`
    );
    printRows(companyCols, 'No company_id columns found');

    printSection('company_id default expressions');
    const companyDefaults = await runQuery(
      client,
      `select t.relname as table, a.attname as column, pg_get_expr(ad.adbin, ad.adrelid) as default_expr
         from pg_attribute a
         join pg_class t on a.attrelid=t.oid
         join pg_namespace n on t.relnamespace=n.oid
         left join pg_attrdef ad on ad.adrelid=a.attrelid and ad.adnum=a.attnum
        where n.nspname='public' and a.attname='company_id'
          and t.relname in ('items','sequences','causals','partners','addresses')
        order by t.relname`
    );
    printRows(companyDefaults);

    // Indexes on stock_movements
    printSection('Indexes on stock_movements');
    const idx = await runQuery(
      client,
      `select indexname, indexdef from pg_indexes where schemaname='public' and tablename='stock_movements' order by 1`
    );
    printRows(idx, 'No indexes on stock_movements');

    // Constraints existence
    printSection('FK/unique constraints');
    const cons = await runQuery(
      client,
      `select t.relname as table, c.conname, pg_get_constraintdef(c.oid) as def
         from pg_constraint c
         join pg_class t on c.conrelid=t.oid
         join pg_namespace n on t.relnamespace=n.oid
        where n.nspname='public' and t.relname in ('items','sequences','causals','partners','addresses')
        order by t.relname, c.conname`
    );
    printRows(cons, 'No relevant constraints');

    // Compare migrations
    printSection('Migrations comparison');
    const migTable = await detectMigrationTable(client);
    const localFiles = loadLocalMigrationFiles();
    if (!migTable) {
      console.log('No schema_migrations table detected. Skipping DB vs local comparison.');
    } else {
      let applied = [];
      if (migTable.schema === 'public') {
        const rows = await runQuery(client, 'select filename from public.schema_migrations order by 1');
        if (!rows.__error) applied = rows.map((r) => r.filename);
      } else if (migTable.schema === 'supabase_migrations') {
        const rows = await runQuery(client, 'select * from supabase_migrations.schema_migrations');
        if (!rows.__error) {
          // Try to reconstruct filename patterns
          for (const r of rows) {
            if (r.filename) {
              applied.push(r.filename);
            } else if (r.name && r.version) {
              applied.push(`${r.version}_${r.name}.sql`);
            } else if (r.name) {
              applied.push(`${r.name}.sql`);
            } else if (r.version) {
              applied.push(`${r.version}.sql`);
            }
          }
          applied = applied.sort();
        }
      }
      const setLocal = new Set(localFiles);
      const setApplied = new Set(applied);
      const missingInDb = localFiles.filter((f) => !setApplied.has(f));
      const extraInDb = applied.filter((f) => !setLocal.has(f));
      console.log('- Local migration files:', localFiles.length);
      console.log('- Applied migrations (db):', applied.length);
      if (missingInDb.length) {
        console.log('> Missing in DB:');
        for (const f of missingInDb) console.log('  - ' + f);
      } else {
        console.log('> DB is up-to-date with local files');
      }
      if (extraInDb.length) {
        console.log('> Present in DB but not in repo:');
        for (const f of extraInDb) console.log('  - ' + f);
      }
    }

    // Summary checks
    printSection('Summary');
    const problems = [];
    if (!Array.isArray(rls) || rls.__error) {
      problems.push('Failed to read RLS status');
    }
    const missingRls = Array.isArray(expectedStatus)
      ? expectedStatus.filter((r) => r.status !== 'OK')
      : [];
    if (missingRls.length) problems.push(`RLS issues on: ${missingRls.map((r) => r.tablename + ':' + r.status).join(', ')}`);
    if (idx.__error) problems.push('Failed to list stock_movements indexes');

    if (problems.length === 0) {
      console.log('All core checks passed.');
    } else {
      console.log('Issues detected:');
      for (const p of problems) console.log('- ' + p);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Audit failed:', err.message || err);
  process.exit(1);
});
