-- Simple performance indexes for MagSuite
-- Only creates indexes on tables and columns that definitely exist

-- Basic indexes on core tables (safe to create)
CREATE INDEX IF NOT EXISTS idx_items_id ON items(id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
    END IF;
END $$;

-- Basic indexes on documents
CREATE INDEX IF NOT EXISTS idx_documents_id ON documents(id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
    END IF;
END $$;

-- Basic indexes on users
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
    END IF;
END $$;

-- Basic indexes on stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_id ON stock_movements(id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
    END IF;
END $$;

-- Basic indexes on partners
CREATE INDEX IF NOT EXISTS idx_partners_id ON partners(id);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_partners_company_id ON partners(company_id);
    END IF;
END $$;

-- Basic indexes on warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_id ON warehouses(id);

-- Only create company_id indexes if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouses' AND column_name = 'company_id') THEN
        CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);
    END IF;
END $$;
