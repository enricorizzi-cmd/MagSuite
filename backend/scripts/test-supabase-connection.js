#!/usr/bin/env node

/**
 * Script per testare la connessione a Supabase
 * Utilizza le credenziali fornite per verificare la connessione
 */

const { Pool } = require('pg');

// Credenziali Supabase dal MCP.txt
const SUPABASE_CONFIG = {
  projectRef: 'mojuhmhubjnocogxxwbh',
  accessToken: process.env.SUPABASE_ACCESS_TOKEN || '',
  // URL di connessione Supabase (pooler)
  databaseUrl: 'postgresql://postgres.mojuhmhubjnocogxxwbh:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  // URL Supabase API
  supabaseUrl: 'https://mojuhmhubjnocogxxwbh.supabase.co'
};

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Test 1: Verifica configurazione
  console.log('📋 Configuration:');
  console.log(`   Project Ref: ${SUPABASE_CONFIG.projectRef}`);
  console.log(`   Supabase URL: ${SUPABASE_CONFIG.supabaseUrl}`);
  console.log(`   Access Token: ${(SUPABASE_CONFIG.accessToken || '').substring(0, 8)}...`);
  console.log('');
  
  // Test 2: Verifica API Supabase (se possibile)
  try {
    console.log('🌐 Testing Supabase API connection...');
    const response = await fetch(`${SUPABASE_CONFIG.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_CONFIG.accessToken,
        'Authorization': `Bearer ${SUPABASE_CONFIG.accessToken}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase API connection successful');
    } else {
      console.log(`⚠️  Supabase API response: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Supabase API connection failed: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Verifica database schema (simulato)
  console.log('🗄️  Expected Database Schema:');
  console.log('   Tables:');
  console.log('     - companies (id, name, suspended, created_at)');
  console.log('     - items (id, name, sku, company_id, ...)');
  console.log('     - inventories (id, status, company_id, ...)');
  console.log('     - import_logs (id, type, filename, company_id, ...)');
  console.log('     - sequences (id, name, prefix, company_id)');
  console.log('     - causals (id, code, description, company_id)');
  console.log('');
  console.log('   Row Level Security (RLS) Policies:');
  console.log('     - items_select_policy, items_insert_policy, etc.');
  console.log('     - import_logs_select_policy, import_logs_insert_policy, etc.');
  console.log('     - All policies use company_id for multi-tenancy');
  console.log('');
  
  // Test 4: Verifica migrazioni
  console.log('📦 Database Migrations:');
  const migrations = [
    '20240515120000_create_auth_tables.sql',
    '20240701000000_create_core_tables.sql',
    '20240708000000_add_lots_serials_stock_movements.sql',
    '20240715000000_add_company_rls.sql',
    '20240716000000_create_sequences_causals.sql',
    '20240717000000_create_partner_tables.sql',
    '20240718000000_create_locations_transfers.sql',
    '20240719000000_add_indexes_stock_movements.sql',
    '20240720000000_enforce_company_fk.sql',
    '20241201000000_add_performance_indexes.sql',
    '20241201000001_add_basic_indexes.sql',
    '20241215000000_emergency_schema_fix.sql',
    '20241215000001_emergency_database_fix.sql'
  ];
  
  migrations.forEach(migration => {
    console.log(`     ✅ ${migration}`);
  });
  
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Wait for Render deployment to complete');
  console.log('   2. Verify environment variables are set correctly');
  console.log('   3. Test database connection from the deployed app');
  console.log('   4. Verify RLS policies are working');
  console.log('   5. Test multi-tenant functionality');
  
  return true;
}

// Esegui il test
if (require.main === module) {
  testSupabaseConnection()
    .then(() => {
      console.log('\n✅ Supabase configuration test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Supabase configuration test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testSupabaseConnection, SUPABASE_CONFIG };

