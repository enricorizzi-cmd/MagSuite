CREATE TABLE IF NOT EXISTS locations (
  id serial primary key,
  warehouse_id integer references warehouses(id) on delete cascade,
  name text not null,
  parent_id integer references locations(id) on delete cascade
);

CREATE TABLE IF NOT EXISTS transfers (
  id serial primary key,
  item_id integer references items(id),
  source_location_id integer references locations(id),
  dest_location_id integer references locations(id),
  quantity numeric not null,
  status text default 'draft',
  document_id integer references documents(id)
);
