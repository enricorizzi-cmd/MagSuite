#!/bin/bash
# Emergency Database Fix Script
# This script applies the emergency schema fix to resolve Render deployment issues

echo "🚨 Applying Emergency Database Schema Fix..."

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20241215000000_emergency_schema_fix.sql" ]; then
    echo "❌ Error: Emergency migration file not found!"
    echo "Please run this script from the MagSuite root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found!"
    echo "Please install Supabase CLI: npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase!"
    echo "Please run: supabase login"
    exit 1
fi

echo "✅ Supabase CLI found and logged in"

# Apply the emergency migration
echo "📝 Applying emergency schema fix..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ Emergency schema fix applied successfully!"
    echo ""
    echo "🔍 Verifying database schema..."
    
    # Verify the fix by checking if critical tables exist
    echo "Checking companies table..."
    supabase db shell --command "SELECT COUNT(*) FROM companies;"
    
    echo "Checking items table structure..."
    supabase db shell --command "SELECT column_name FROM information_schema.columns WHERE table_name = 'items' AND column_name IN ('company_id', 'sku');"
    
    echo "Checking inventories table structure..."
    supabase db shell --command "SELECT column_name FROM information_schema.columns WHERE table_name = 'inventories' AND column_name = 'company_id';"
    
    echo ""
    echo "🎉 Database schema fix completed!"
    echo "You can now redeploy your application to Render."
    
else
    echo "❌ Error applying emergency schema fix!"
    echo "Please check the error messages above and try again."
    exit 1
fi
