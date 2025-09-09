CREATE TABLE IF NOT EXISTS warehouses (
  id serial primary key,
  name text not null unique
);

CREATE TABLE IF NOT EXISTS items (
  id serial primary key,
  name text not null,
  sku text not null unique,
  lotti boolean default false,
  seriali boolean default false,
  uom text,
  mrp numeric
);

CREATE TABLE IF NOT EXISTS documents (
  id serial primary key,
  type text not null,
  status text default 'draft',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS document_lines (
  id serial primary key,
  document_id integer references documents(id) on delete cascade,
  item_id integer references items(id),
  quantity numeric not null
);

CREATE TABLE IF NOT EXISTS movements (
  id serial primary key,
  document_id integer references documents(id),
  item_id integer references items(id),
  warehouse_id integer references warehouses(id),
  quantity numeric not null,
  moved_at timestamptz default now()
);
