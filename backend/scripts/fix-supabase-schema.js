#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://mojuhmhubjnocogxxwbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vanVobWh1Ympub2NvZ3h4d2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3NDgwMCwiZXhwIjoyMDUwNTUwODAwfQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSupabaseSchema() {
  console.log('🔧 Fixing Supabase database schema...\n');
  
  try {
    // 1. Create companies table
    console.log('📋 Creating companies table...');
    const { error: companiesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          suspended BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });
    
    if (companiesError) {
      console.log('⚠️ Companies table might already exist:', companiesError.message);
    } else {
      console.log('✅ Companies table created');
    }
    
    // 2. Insert default company
    console.log('🏢 Inserting default company...');
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO companies (id, name) VALUES (1, 'Default Company') 
        ON CONFLICT (id) DO NOTHING;
      `
    });
    
    if (insertError) {
      console.log('⚠️ Default company might already exist:', insertError.message);
    } else {
      console.log('✅ Default company inserted');
    }
    
    // 3. Create items table with company_id
    console.log('📦 Creating items table...');
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
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
        );
      `
    });
    
    if (itemsError) {
      console.log('⚠️ Items table might already exist:', itemsError.message);
    } else {
      console.log('✅ Items table created');
    }
    
    // 4. Add company_id to existing tables if missing
    const tablesToFix = [
      'customers', 'suppliers', 'warehouses', 'locations', 
      'lots', 'sequences', 'causals', 'price_lists', 
      'documents', 'transfers', 'inventories', 'imports'
    ];
    
    for (const tableName of tablesToFix) {
      console.log(`🔧 Fixing ${tableName} table...`);
      
      // Check if table exists
      const { data: tableExists } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${tableName}'
          );
        `
      });
      
      if (tableExists && tableExists[0]?.exists) {
        // Add company_id column if missing
        const { error: addColumnError } = await supabase.rpc('exec_sql', {
          sql: `
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
          `
        });
        
        if (addColumnError) {
          console.log(`⚠️ Error adding company_id to ${tableName}:`, addColumnError.message);
        } else {
          console.log(`✅ Fixed ${tableName} table`);
        }
      } else {
        // Create table with company_id
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS ${tableName} (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              company_id INTEGER REFERENCES companies(id) DEFAULT 1,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
            );
          `
        });
        
        if (createError) {
          console.log(`⚠️ Error creating ${tableName}:`, createError.message);
        } else {
          console.log(`✅ Created ${tableName} table`);
        }
      }
    }
    
    // 5. Create indexes for performance
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_warehouses_company_id ON warehouses(company_id);'
    ];
    
    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.log('⚠️ Index creation warning:', indexError.message);
      }
    }
    
    console.log('✅ Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixSupabaseSchema()
    .then(() => {
      console.log('🎉 Schema fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSupabaseSchema };
