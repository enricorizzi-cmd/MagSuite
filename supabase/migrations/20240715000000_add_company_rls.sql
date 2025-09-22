CREATE TABLE IF NOT EXISTS companies (
  id serial primary key,
  name text not null unique
);

alter table users add column if not exists company_id integer references companies(id);
alter table items add column if not exists company_id integer references companies(id);

alter table items enable row level security;
-- Idempotent reset to avoid duplicate policy errors on re-run
drop policy if exists items_select_policy on items;
drop policy if exists items_insert_policy on items;
drop policy if exists items_update_policy on items;
drop policy if exists items_delete_policy on items;

alter table items alter column company_id set default current_setting('app.current_company_id', true)::int;
alter table items alter column company_id set not null;

create policy items_select_policy on items
  for select using (company_id = current_setting('app.current_company_id', true)::int);

create policy items_insert_policy on items
  for insert with check (company_id = current_setting('app.current_company_id', true)::int);

create policy items_update_policy on items
  for update using (company_id = current_setting('app.current_company_id', true)::int)
  with check (company_id = current_setting('app.current_company_id', true)::int);

create policy items_delete_policy on items
  for delete using (company_id = current_setting('app.current_company_id', true)::int);