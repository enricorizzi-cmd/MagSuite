const db = require('./db');

async function fixDatabaseIssues() {
  console.log('Starting database fixes...');
  
  try {
    // 1. Ensure companies table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        suspended BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // 2. Insert default company if none exists
    await db.query(`
      INSERT INTO companies (id, name) VALUES (1, 'Default Company') 
      ON CONFLICT (id) DO NOTHING
    `);
    
    // 3. Ensure items table exists with company_id
    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        lotti BOOLEAN DEFAULT false,
        seriali BOOLEAN DEFAULT false,
        uom TEXT,
        mrp NUMERIC,
        company_id INTEGER REFERENCES companies(id) DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // 4. Fix items table - add missing columns
    await db.query(`
      DO $$
      BEGIN
        -- Add sku if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sku') THEN
          ALTER TABLE items ADD COLUMN sku TEXT;
          UPDATE items SET sku = 'SKU' || id WHERE sku IS NULL;
          ALTER TABLE items ALTER COLUMN sku SET NOT NULL;
          ALTER TABLE items ADD CONSTRAINT items_sku_unique UNIQUE (sku);
        END IF;
        
        -- Add company_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'company_id') THEN
          ALTER TABLE items ADD COLUMN company_id INTEGER REFERENCES companies(id) DEFAULT 1;
          UPDATE items SET company_id = 1 WHERE company_id IS NULL;
        END IF;
      END $$
    `);
    
    // 5. Fix all other tables to include company_id
    const tablesToFix = [
      'customers', 'suppliers', 'warehouses', 'locations', 
      'lots', 'sequences', 'causals', 'price_lists', 
      'documents', 'transfers', 'inventories', 'imports'
    ];
    
    for (const tableName of tablesToFix) {
      // Create table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          company_id INTEGER REFERENCES companies(id) DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      
      // Add company_id if missing
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '${tableName}' AND column_name = 'company_id'
          ) THEN
            ALTER TABLE ${tableName} ADD COLUMN company_id INTEGER REFERENCES companies(id) DEFAULT 1;
            UPDATE ${tableName} SET company_id = 1 WHERE company_id IS NULL;
          END IF;
        END $$
      `);
    }
    
    // 6. Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);'
    ];
    
    for (const indexSql of indexes) {
      try {
        await db.query(indexSql);
      } catch (error) {
        console.log(`Warning: Could not create index: ${error.message}`);
      }
    }
    
    console.log('Database fixes completed successfully');
    return true;
  } catch (error) {
    console.error('Database fix failed:', error);
    return false;
  }
}

module.exports = { fixDatabaseIssues };
