-- Database Emergency Fix Migration
-- This migration fixes critical issues preventing the app from working on Render

-- 1. Ensure companies table exists
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert default company if none exists
INSERT INTO companies (id, name) VALUES (1, 'Default Company') 
ON CONFLICT (id) DO NOTHING;

-- 3. Fix items table - add missing columns
DO $$
BEGIN
  -- Add company_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'company_id') THEN
    ALTER TABLE items ADD COLUMN company_id INTEGER REFERENCES companies(id);
  END IF;
  
  -- Add sku if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sku') THEN
    ALTER TABLE items ADD COLUMN sku TEXT;
    UPDATE items SET sku = 'SKU' || id WHERE sku IS NULL;
    ALTER TABLE items ALTER COLUMN sku SET NOT NULL;
    ALTER TABLE items ADD CONSTRAINT items_sku_unique UNIQUE (sku);
  END IF;
END $$;

-- 4. Update existing items to have company_id
UPDATE items SET company_id = 1 WHERE company_id IS NULL;

-- 5. Make company_id NOT NULL for items
ALTER TABLE items ALTER COLUMN company_id SET NOT NULL;

-- 6. Fix policies - drop and recreate to avoid duplicates
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS items_select_policy ON items;
  DROP POLICY IF EXISTS items_insert_policy ON items;
  DROP POLICY IF EXISTS items_update_policy ON items;
  DROP POLICY IF EXISTS items_delete_policy ON items;
  
  -- Enable RLS
  ALTER TABLE items ENABLE ROW LEVEL SECURITY;
  
  -- Create new policies
  CREATE POLICY items_select_policy ON items
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY items_insert_policy ON items
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY items_update_policy ON items
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY items_delete_policy ON items
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
END $$;

-- 7. Fix import_logs policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS import_logs_select ON import_logs;
  DROP POLICY IF EXISTS import_logs_insert ON import_logs;
  DROP POLICY IF EXISTS import_logs_update ON import_logs;
  DROP POLICY IF EXISTS import_logs_delete ON import_logs;
  
  -- Enable RLS
  ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
  
  -- Create new policies
  CREATE POLICY import_logs_select ON import_logs
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY import_logs_insert ON import_logs
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY import_logs_update ON import_logs
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  CREATE POLICY import_logs_delete ON import_logs
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_import_logs_company_id ON import_logs(company_id);

-- Success message
SELECT 'Emergency database fix completed successfully' AS status;
