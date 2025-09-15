-- Emergency Database Schema Fix
-- This migration fixes critical schema issues identified in Render logs

-- 1. Ensure companies table exists
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fix items table - ensure all required columns exist
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  lotti BOOLEAN DEFAULT false,
  seriali BOOLEAN DEFAULT false,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to items table if they don't exist
DO $$
BEGIN
  -- Add company_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'company_id') THEN
    ALTER TABLE items ADD COLUMN company_id INTEGER REFERENCES companies(id);
  END IF;
  
  -- Add sku if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sku') THEN
    ALTER TABLE items ADD COLUMN sku TEXT;
    -- Update existing records with auto-generated SKU
    UPDATE items SET sku = 'SKU' || id WHERE sku IS NULL;
    ALTER TABLE items ALTER COLUMN sku SET NOT NULL;
    ALTER TABLE items ADD CONSTRAINT items_sku_unique UNIQUE (sku);
  END IF;
  
  -- Add other business columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'barcode') THEN
    ALTER TABLE items ADD COLUMN barcode TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'code') THEN
    ALTER TABLE items ADD COLUMN code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'description') THEN
    ALTER TABLE items ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'type') THEN
    ALTER TABLE items ADD COLUMN type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'category') THEN
    ALTER TABLE items ADD COLUMN category TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'group') THEN
    ALTER TABLE items ADD COLUMN "group" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'class') THEN
    ALTER TABLE items ADD COLUMN class TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'manufacturer') THEN
    ALTER TABLE items ADD COLUMN manufacturer TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'distributor') THEN
    ALTER TABLE items ADD COLUMN distributor TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'supplier') THEN
    ALTER TABLE items ADD COLUMN supplier TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'notes') THEN
    ALTER TABLE items ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'size') THEN
    ALTER TABLE items ADD COLUMN size TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'color') THEN
    ALTER TABLE items ADD COLUMN color TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'purchase_price') THEN
    ALTER TABLE items ADD COLUMN purchase_price NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'avg_weighted_price') THEN
    ALTER TABLE items ADD COLUMN avg_weighted_price NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'min_stock') THEN
    ALTER TABLE items ADD COLUMN min_stock INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'rotation_index') THEN
    ALTER TABLE items ADD COLUMN rotation_index NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'last_purchase_date') THEN
    ALTER TABLE items ADD COLUMN last_purchase_date DATE;
  END IF;
END $$;

-- 3. Ensure inventories table exists with proper schema
CREATE TABLE IF NOT EXISTS inventories (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL,
  scope JSONB,
  counts JSONB DEFAULT '[]',
  differences JSONB DEFAULT '[]',
  delta JSONB DEFAULT '[]',
  approvals JSONB DEFAULT '[]',
  audit JSONB DEFAULT '[]',
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add company_id to inventories if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventories' AND column_name = 'company_id') THEN
    ALTER TABLE inventories ADD COLUMN company_id INTEGER REFERENCES companies(id);
  END IF;
END $$;

-- 4. Ensure import_logs table exists with proper schema
CREATE TABLE IF NOT EXISTS import_logs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  log JSONB DEFAULT '[]',
  file BYTEA,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add company_id to import_logs if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_logs' AND column_name = 'company_id') THEN
    ALTER TABLE import_logs ADD COLUMN company_id INTEGER REFERENCES companies(id);
  END IF;
END $$;

-- 5. Ensure sequences table exists
CREATE TABLE IF NOT EXISTS sequences (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT DEFAULT '',
  next_number INTEGER NOT NULL DEFAULT 1,
  company_id INTEGER REFERENCES companies(id)
);

-- 6. Ensure causals table exists
CREATE TABLE IF NOT EXISTS causals (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT,
  sign INTEGER NOT NULL DEFAULT 1,
  company_id INTEGER REFERENCES companies(id)
);

-- 7. Set up Row Level Security for multi-tenancy
DO $$
BEGIN
  -- Items
  ALTER TABLE items ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'items_select_policy'
  ) THEN
    CREATE POLICY items_select_policy ON items
      FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'items_insert_policy'
  ) THEN
    CREATE POLICY items_insert_policy ON items
      FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'items_update_policy'
  ) THEN
    CREATE POLICY items_update_policy ON items
      FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'items_delete_policy'
  ) THEN
    CREATE POLICY items_delete_policy ON items
      FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;

  -- Inventories
  ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventories' AND policyname = 'inventories_select'
  ) THEN
    CREATE POLICY inventories_select ON inventories
      FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventories' AND policyname = 'inventories_insert'
  ) THEN
    CREATE POLICY inventories_insert ON inventories
      FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventories' AND policyname = 'inventories_update'
  ) THEN
    CREATE POLICY inventories_update ON inventories
      FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventories' AND policyname = 'inventories_delete'
  ) THEN
    CREATE POLICY inventories_delete ON inventories
      FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;

  -- import_logs
  ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'import_logs' AND policyname = 'import_logs_select'
  ) THEN
    CREATE POLICY import_logs_select ON import_logs
      FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'import_logs' AND policyname = 'import_logs_insert'
  ) THEN
    CREATE POLICY import_logs_insert ON import_logs
      FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'import_logs' AND policyname = 'import_logs_update'
  ) THEN
    CREATE POLICY import_logs_update ON import_logs
      FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'import_logs' AND policyname = 'import_logs_delete'
  ) THEN
    CREATE POLICY import_logs_delete ON import_logs
      FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;

  -- sequences
  ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sequences' AND policyname = 'sequences_select'
  ) THEN
    CREATE POLICY sequences_select ON sequences
      FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sequences' AND policyname = 'sequences_insert'
  ) THEN
    CREATE POLICY sequences_insert ON sequences
      FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sequences' AND policyname = 'sequences_update'
  ) THEN
    CREATE POLICY sequences_update ON sequences
      FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sequences' AND policyname = 'sequences_delete'
  ) THEN
    CREATE POLICY sequences_delete ON sequences
      FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;

  -- causals
  ALTER TABLE causals ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'causals' AND policyname = 'causals_select'
  ) THEN
    CREATE POLICY causals_select ON causals
      FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'causals' AND policyname = 'causals_insert'
  ) THEN
    CREATE POLICY causals_insert ON causals
      FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'causals' AND policyname = 'causals_update'
  ) THEN
    CREATE POLICY causals_update ON causals
      FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
      WITH CHECK (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'causals' AND policyname = 'causals_delete'
  ) THEN
    CREATE POLICY causals_delete ON causals
      FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int);
  END IF;
END $$;

-- 8. Add unique constraints
DO $$
BEGIN
  -- Add unique constraint for sequences
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sequences_company_name_unique') THEN
    ALTER TABLE sequences ADD CONSTRAINT sequences_company_name_unique UNIQUE (company_id, name);
  END IF;
  
  -- Add unique constraint for causals
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'causals_company_code_unique') THEN
    ALTER TABLE causals ADD CONSTRAINT causals_company_code_unique UNIQUE (company_id, code);
  END IF;
END $$;

-- 9. Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_inventories_company_id ON inventories(company_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_company_id ON import_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sequences_company_id ON sequences(company_id);
CREATE INDEX IF NOT EXISTS idx_causals_company_id ON causals(company_id);

-- 10. Insert default company if none exists
INSERT INTO companies (id, name) VALUES (1, 'Default Company') 
ON CONFLICT (id) DO NOTHING;

-- 11. Update existing items to have company_id if they don't have one
UPDATE items SET company_id = 1 WHERE company_id IS NULL;

-- 12. Make company_id NOT NULL for items
ALTER TABLE items ALTER COLUMN company_id SET NOT NULL;

-- Success message
SELECT 'Emergency database schema fix completed successfully' AS status;
