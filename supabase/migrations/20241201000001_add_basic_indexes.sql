-- Ultra-simple performance indexes for MagSuite
-- Only creates indexes on columns that definitely exist in the base schema

-- Basic indexes on items (from 20240701000000_create_core_tables.sql)
CREATE INDEX IF NOT EXISTS idx_items_id ON items(id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);

-- Basic indexes on documents (from 20240701000000_create_core_tables.sql)
CREATE INDEX IF NOT EXISTS idx_documents_id ON documents(id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Basic indexes on warehouses (from 20240701000000_create_core_tables.sql)
CREATE INDEX IF NOT EXISTS idx_warehouses_id ON warehouses(id);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);

-- Basic indexes on stock_movements (from 20240708000000_add_lots_serials_stock_movements.sql)
CREATE INDEX IF NOT EXISTS idx_stock_movements_id ON stock_movements(id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_moved_at ON stock_movements(moved_at);

-- Basic indexes on lots (from 20240708000000_add_lots_serials_stock_movements.sql)
CREATE INDEX IF NOT EXISTS idx_lots_id ON lots(id);
CREATE INDEX IF NOT EXISTS idx_lots_item_id ON lots(item_id);

-- Basic indexes on serials (from 20240708000000_add_lots_serials_stock_movements.sql)
CREATE INDEX IF NOT EXISTS idx_serials_id ON serials(id);
CREATE INDEX IF NOT EXISTS idx_serials_item_id ON serials(item_id);

-- Basic indexes on users (from 20240515120000_create_auth_tables.sql)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Basic indexes on partners (from 20240717000000_create_partner_tables.sql)
CREATE INDEX IF NOT EXISTS idx_partners_id ON partners(id);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);

-- Basic indexes on addresses (from 20240717000000_create_partner_tables.sql)
CREATE INDEX IF NOT EXISTS idx_addresses_id ON addresses(id);
CREATE INDEX IF NOT EXISTS idx_addresses_partner_id ON addresses(partner_id);
