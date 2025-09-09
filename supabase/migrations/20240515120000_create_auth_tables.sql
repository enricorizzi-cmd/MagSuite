CREATE TABLE IF NOT EXISTS roles (
  id serial primary key,
  name text unique not null
);

CREATE TABLE IF NOT EXISTS permissions (
  id serial primary key,
  role_id integer references roles(id) on delete cascade,
  module text not null,
  action text not null,
  unique(role_id, module, action)
);

CREATE TABLE IF NOT EXISTS users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  role_id integer references roles(id),
  warehouse_id integer
);
