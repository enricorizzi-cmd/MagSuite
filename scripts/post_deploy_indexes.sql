-- Post-deployment index creation script
-- Run this after successful deployment to add performance indexes

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to safely create indexes only if they don't exist and columns exist
CREATE OR REPLACE FUNCTION create_index_if_column_exists(
    index_name TEXT,
    table_name TEXT,
    column_name TEXT,
    index_type TEXT DEFAULT 'btree'
) RETURNS VOID AS $$
BEGIN
    -- Check if column exists and index doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $2 AND column_name = $3
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = $2 AND indexname = $1
    ) THEN
        EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I (%I) USING %s', 
                      $1, $2, $3, $4);
        RAISE NOTICE 'Created index % on %.%', $1, $2, $3;
    ELSE
        RAISE NOTICE 'Skipped index % - column %.% not found or index exists', $1, $2, $3;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely create composite indexes
CREATE OR REPLACE FUNCTION create_composite_index_if_columns_exist(
    index_name TEXT,
    table_name TEXT,
    column_list TEXT[],
    index_type TEXT DEFAULT 'btree'
) RETURNS VOID AS $$
DECLARE
    col TEXT;
    all_columns_exist BOOLEAN := TRUE;
BEGIN
    -- Check if all columns exist
    FOREACH col IN ARRAY $3
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = $2 AND column_name = col
        ) THEN
            all_columns_exist := FALSE;
            EXIT;
        END IF;
    END LOOP;
    
    -- Create index if all columns exist and index doesn't exist
    IF all_columns_exist AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = $2 AND indexname = $1
    ) THEN
        EXECUTE format('CREATE INDEX CONCURRENTLY %I ON %I (%s) USING %s', 
                      $1, $2, array_to_string($3, ', '), $4);
        RAISE NOTICE 'Created composite index % on %.%', $1, $2, array_to_string($3, ', ');
    ELSE
        RAISE NOTICE 'Skipped composite index % - some columns missing or index exists', $1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Basic performance indexes
\echo 'Creating basic performance indexes...'

-- Items table indexes
SELECT create_index_if_column_exists('idx_items_name', 'items', 'name');
SELECT create_index_if_column_exists('idx_items_sku', 'items', 'sku');
SELECT create_index_if_column_exists('idx_items_company_id', 'items', 'company_id');
SELECT create_composite_index_if_columns_exist('idx_items_company_name', 'items', ARRAY['company_id', 'name']);
SELECT create_composite_index_if_columns_exist('idx_items_company_sku', 'items', ARRAY['company_id', 'sku']);

-- Documents table indexes
SELECT create_index_if_column_exists('idx_documents_created_at', 'documents', 'created_at');
SELECT create_index_if_column_exists('idx_documents_type', 'documents', 'type');
SELECT create_index_if_column_exists('idx_documents_status', 'documents', 'status');
SELECT create_index_if_column_exists('idx_documents_company_id', 'documents', 'company_id');
SELECT create_composite_index_if_columns_exist('idx_documents_company_created', 'documents', ARRAY['company_id', 'created_at']);
SELECT create_composite_index_if_columns_exist('idx_documents_company_type', 'documents', ARRAY['company_id', 'type']);

-- Warehouses table indexes
SELECT create_index_if_column_exists('idx_warehouses_name', 'warehouses', 'name');
SELECT create_index_if_column_exists('idx_warehouses_company_id', 'warehouses', 'company_id');

-- Users table indexes
SELECT create_index_if_column_exists('idx_users_email', 'users', 'email');
SELECT create_index_if_column_exists('idx_users_company_id', 'users', 'company_id');
SELECT create_index_if_column_exists('idx_users_role_id', 'users', 'role_id');

-- Partners table indexes
SELECT create_index_if_column_exists('idx_partners_name', 'partners', 'name');
SELECT create_index_if_column_exists('idx_partners_type', 'partners', 'type');
SELECT create_index_if_column_exists('idx_partners_company_id', 'partners', 'company_id');
SELECT create_index_if_column_exists('idx_partners_email', 'partners', 'email');
SELECT create_composite_index_if_columns_exist('idx_partners_company_type', 'partners', ARRAY['company_id', 'type']);

-- Stock movements table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        PERFORM create_index_if_column_exists('idx_stock_movements_item_id', 'stock_movements', 'item_id');
        PERFORM create_index_if_column_exists('idx_stock_movements_warehouse_id', 'stock_movements', 'warehouse_id');
        PERFORM create_index_if_column_exists('idx_stock_movements_moved_at', 'stock_movements', 'moved_at');
        PERFORM create_index_if_column_exists('idx_stock_movements_company_id', 'stock_movements', 'company_id');
        PERFORM create_composite_index_if_columns_exist('idx_stock_movements_item_warehouse', 'stock_movements', ARRAY['item_id', 'warehouse_id']);
        PERFORM create_composite_index_if_columns_exist('idx_stock_movements_company_date', 'stock_movements', ARRAY['company_id', 'moved_at']);
        RAISE NOTICE 'Stock movements indexes processed';
    ELSE
        RAISE NOTICE 'Stock movements table not found - skipping indexes';
    END IF;
END $$;

-- Lots table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lots') THEN
        PERFORM create_index_if_column_exists('idx_lots_item_id', 'lots', 'item_id');
        PERFORM create_index_if_column_exists('idx_lots_lot', 'lots', 'lot');
        PERFORM create_index_if_column_exists('idx_lots_expiry', 'lots', 'expiry');
        PERFORM create_index_if_column_exists('idx_lots_blocked', 'lots', 'blocked');
        RAISE NOTICE 'Lots indexes processed';
    ELSE
        RAISE NOTICE 'Lots table not found - skipping indexes';
    END IF;
END $$;

-- Serials table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'serials') THEN
        PERFORM create_index_if_column_exists('idx_serials_item_id', 'serials', 'item_id');
        PERFORM create_index_if_column_exists('idx_serials_serial', 'serials', 'serial');
        PERFORM create_index_if_column_exists('idx_serials_expiry', 'serials', 'expiry');
        PERFORM create_index_if_column_exists('idx_serials_blocked', 'serials', 'blocked');
        RAISE NOTICE 'Serials indexes processed';
    ELSE
        RAISE NOTICE 'Serials table not found - skipping indexes';
    END IF;
END $$;

-- Text search indexes (using pg_trgm)
\echo 'Creating text search indexes...'

-- Full-text search indexes for better search performance
SELECT create_index_if_column_exists('idx_items_name_trgm', 'items', 'name', 'gin');
SELECT create_index_if_column_exists('idx_items_sku_trgm', 'items', 'sku', 'gin');
SELECT create_index_if_column_exists('idx_partners_name_trgm', 'partners', 'name', 'gin');

-- Clean up helper functions
DROP FUNCTION IF EXISTS create_index_if_column_exists(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_composite_index_if_columns_exist(TEXT, TEXT, TEXT[], TEXT);

\echo 'Post-deployment index creation completed!'

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
