/* Focused checks: RLS + policies on key tables, company_id defaults, stock_movements indexes */
const { Client } = require('pg');

function cfg() {
  const cs = process.env.DATABASE_URL;
  const sslMode = (process.env.PGSSLMODE || 'require').toLowerCase();
  const useSSL = sslMode !== 'disable';
  const allowInvalid = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || sslMode === 'no-verify';
  const ssl = useSSL ? { rejectUnauthorized: !allowInvalid } : false;
  return cs ? { connectionString: cs, ssl } : {
    host: process.env.PGHOST, port: process.env.PGPORT,
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE,
    ssl,
  };
}

async function q(client, text, params) {
  const { rows } = await client.query(text, params);
  return rows;
}

async function main() {
  const client = new Client(cfg());
  await client.connect();
  try {
    const tables = ['items','sequences','causals','partners','addresses'];
    console.log('RLS status:');
    const rls = await q(client, `select c.relname as table, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname = any($1::text[]) order by 1`, [tables]);
    for (const r of rls) console.log(`- ${r.table}: ${r.rls}`);

    console.log('\nPolicies:');
    const policies = await q(client, `select tablename, policyname, cmd from pg_policies where schemaname='public' and tablename = any($1::text[]) order by 1,3,2`, [tables]);
    for (const p of policies) console.log(`- ${p.tablename}: ${p.cmd} -> ${p.policyname}`);

    console.log('\ncompany_id columns:');
    const cols = await q(client, `select table_name, is_nullable, column_default from information_schema.columns where table_schema='public' and column_name='company_id' and table_name = any($1::text[]) order by 1`, [tables]);
    for (const c of cols) console.log(`- ${c.table_name}: nullable=${c.is_nullable} default=${c.column_default}`);

    console.log('\nstock_movements indexes:');
    const idx = await q(client, `select indexname from pg_indexes where schemaname='public' and tablename='stock_movements' order by 1`);
    for (const i of idx) console.log(`- ${i.indexname}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error('check-core failed:', e.message); process.exit(1); });

