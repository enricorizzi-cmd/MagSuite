-- Performance optimization indexes for MagSuite
-- These indexes will significantly improve query performance
-- Note: CONCURRENTLY removed for migration compatibility

-- Items table indexes
CREATE INDEX IF NOT EXISTS idx_items_company_sku ON items(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_items_company_name ON items(company_id, name);
CREATE INDEX IF NOT EXISTS idx_items_company_type ON items(company_id, type);
CREATE INDEX IF NOT EXISTS idx_items_company_category ON items(company_id, category);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_created ON documents(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_company_type ON documents(company_id, type);
CREATE INDEX IF NOT EXISTS idx_documents_company_causal ON documents(company_id, causal);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_company_email ON users(company_id, email);
CREATE INDEX IF NOT EXISTS idx_users_company_status ON users(company_id, status);

-- Stock movements indexes (already exist but ensuring they're optimal)
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_warehouse ON stock_movements(item_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_date ON stock_movements(company_id, moved_at);

-- Partners table indexes
CREATE INDEX IF NOT EXISTS idx_partners_company_type ON partners(company_id, type);
CREATE INDEX IF NOT EXISTS idx_partners_company_name ON partners(company_id, name);

-- Warehouses table indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);

-- Locations table indexes
CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON locations(warehouse_id);

-- Transfers table indexes
CREATE INDEX IF NOT EXISTS idx_transfers_company_date ON transfers(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_from_warehouse ON transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_warehouse ON transfers(to_warehouse_id);

-- Lots table indexes
CREATE INDEX IF NOT EXISTS idx_lots_item ON lots(item_id);
CREATE INDEX IF NOT EXISTS idx_lots_warehouse ON lots(warehouse_id);

-- Serials table indexes
CREATE INDEX IF NOT EXISTS idx_serials_item ON serials(item_id);
CREATE INDEX IF NOT EXISTS idx_serials_warehouse ON serials(warehouse_id);

-- Inventories table indexes
CREATE INDEX IF NOT EXISTS idx_inventories_company_date ON inventories(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventories_warehouse ON inventories(warehouse_id);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po ON purchase_order_lines(po_id);

-- Import logs indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_company_type ON import_logs(company_id, type);
CREATE INDEX IF NOT EXISTS idx_import_logs_created ON import_logs(created_at);

-- Report views indexes
CREATE INDEX IF NOT EXISTS idx_report_views_company_type ON report_views(company_id, type);

-- Connectors indexes
CREATE INDEX IF NOT EXISTS idx_connectors_company_enabled ON connectors(company_id, enabled);
CREATE INDEX IF NOT EXISTS idx_connector_jobs_connector_status ON connector_jobs(connector_id, status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_items_company_type_category ON items(company_id, type, category);
CREATE INDEX IF NOT EXISTS idx_documents_company_type_causal ON documents(company_id, type, causal);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_warehouse_date ON stock_movements(item_id, warehouse_id, moved_at);

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text search indexes for better ILIKE performance (only if pg_trgm is available)
DO $$
BEGIN
    -- Check if pg_trgm extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        -- Create trigram indexes for text search
        CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING gin(name gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_items_sku_trgm ON items USING gin(sku gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_partners_name_trgm ON partners USING gin(name gin_trgm_ops);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently skip if pg_trgm is not available
        NULL;
END $$;
