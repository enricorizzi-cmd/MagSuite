create table warehouses (
  id serial primary key,
  name text not null unique
);

create table items (
  id serial primary key,
  name text not null,
  sku text not null unique,
  lotti boolean default false,
  seriali boolean default false,
  uom text,
  mrp numeric
);

create table documents (
  id serial primary key,
  type text not null,
  status text default 'draft',
  created_at timestamptz default now()
);

create table document_lines (
  id serial primary key,
  document_id integer references documents(id) on delete cascade,
  item_id integer references items(id),
  quantity numeric not null
);

create table movements (
  id serial primary key,
  document_id integer references documents(id),
  item_id integer references items(id),
  warehouse_id integer references warehouses(id),
  quantity numeric not null,
  moved_at timestamptz default now()
);
