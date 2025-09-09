create table partners (
  id serial primary key,
  company_id integer references companies(id),
  type text not null check (type in ('customer','supplier')),
  name text not null,
  vat_id text,
  email text,
  unique(company_id, name)
);

create table addresses (
  id serial primary key,
  partner_id integer references partners(id) on delete cascade,
  type text default 'primary',
  street text,
  city text,
  postal_code text,
  country text,
  company_id integer references companies(id)
);

alter table partners enable row level security;
alter table addresses enable row level security;

alter table partners alter column company_id set default current_setting('app.current_company_id', true)::int;
alter table partners alter column company_id set not null;

alter table addresses alter column company_id set default current_setting('app.current_company_id', true)::int;
alter table addresses alter column company_id set not null;

create policy partners_select on partners
  for select using (company_id = current_setting('app.current_company_id', true)::int);
create policy partners_insert on partners
  for insert with check (company_id = current_setting('app.current_company_id', true)::int);
create policy partners_update on partners
  for update using (company_id = current_setting('app.current_company_id', true)::int)
  with check (company_id = current_setting('app.current_company_id', true)::int);
create policy partners_delete on partners
  for delete using (company_id = current_setting('app.current_company_id', true)::int);

create policy addresses_select on addresses
  for select using (company_id = current_setting('app.current_company_id', true)::int);
create policy addresses_insert on addresses
  for insert with check (company_id = current_setting('app.current_company_id', true)::int);
create policy addresses_update on addresses
  for update using (company_id = current_setting('app.current_company_id', true)::int)
  with check (company_id = current_setting('app.current_company_id', true)::int);
create policy addresses_delete on addresses
  for delete using (company_id = current_setting('app.current_company_id', true)::int);

alter table addresses add constraint addresses_partner_type_unique unique (partner_id, type);
