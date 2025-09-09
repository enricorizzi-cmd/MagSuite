CREATE TABLE IF NOT EXISTS lots (
  id serial primary key,
  item_id integer references items(id),
  lot text not null,
  expiry date,
  blocked boolean default false
);

CREATE TABLE IF NOT EXISTS serials (
  id serial primary key,
  item_id integer references items(id),
  serial text not null,
  expiry date,
  blocked boolean default false
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id serial primary key,
  document_id integer references documents(id),
  item_id integer references items(id),
  warehouse_id integer references warehouses(id),
  quantity numeric not null,
  lot_id integer references lots(id),
  serial_id integer references serials(id),
  expiry date,
  moved_at timestamptz default now()
);
