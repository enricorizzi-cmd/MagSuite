create table roles (
  id serial primary key,
  name text unique not null
);

create table permissions (
  id serial primary key,
  role_id integer references roles(id) on delete cascade,
  module text not null,
  action text not null,
  unique(role_id, module, action)
);

create table users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  role_id integer references roles(id),
  warehouse_id integer
);
