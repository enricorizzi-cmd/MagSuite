CREATE TABLE IF NOT EXISTS sequences (
  id serial primary key,
  name text not null,
  prefix text default '',
  next_number integer not null default 1,
  company_id integer references companies(id)
);

CREATE TABLE IF NOT EXISTS causals (
  id serial primary key,
  code text not null,
  description text,
  sign integer not null default 1,
  company_id integer references companies(id)
);

alter table sequences enable row level security;
alter table causals enable row level security;

alter table sequences alter column company_id set default current_setting('app.current_company_id', true)::int;
alter table sequences alter column company_id set not null;

alter table causals alter column company_id set default current_setting('app.current_company_id', true)::int;
alter table causals alter column company_id set not null;

create policy sequences_select on sequences
  for select using (company_id = current_setting('app.current_company_id', true)::int);
create policy sequences_insert on sequences
  for insert with check (company_id = current_setting('app.current_company_id', true)::int);
create policy sequences_update on sequences
  for update using (company_id = current_setting('app.current_company_id', true)::int)
  with check (company_id = current_setting('app.current_company_id', true)::int);
create policy sequences_delete on sequences
  for delete using (company_id = current_setting('app.current_company_id', true)::int);

create policy causals_select on causals
  for select using (company_id = current_setting('app.current_company_id', true)::int);
create policy causals_insert on causals
  for insert with check (company_id = current_setting('app.current_company_id', true)::int);
create policy causals_update on causals
  for update using (company_id = current_setting('app.current_company_id', true)::int)
  with check (company_id = current_setting('app.current_company_id', true)::int);
create policy causals_delete on causals
  for delete using (company_id = current_setting('app.current_company_id', true)::int);

alter table sequences add constraint sequences_company_name_unique unique (company_id, name);
alter table causals add constraint causals_company_code_unique unique (company_id, code);
