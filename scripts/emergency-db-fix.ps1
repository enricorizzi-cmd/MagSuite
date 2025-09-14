# Emergency Database Fix Script for Windows
# This script applies the emergency schema fix to resolve Render deployment issues

Write-Host "🚨 Applying Emergency Database Schema Fix..." -ForegroundColor Red

# Check if we're in the right directory
if (-not (Test-Path "supabase/migrations/20241215000000_emergency_schema_fix.sql")) {
    Write-Host "❌ Error: Emergency migration file not found!" -ForegroundColor Red
    Write-Host "Please run this script from the MagSuite root directory" -ForegroundColor Yellow
    exit 1
}

# Check if Supabase CLI is available
try {
    $supabaseVersion = supabase --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Supabase CLI not found"
    }
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Please install Supabase CLI: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if we're logged in to Supabase
try {
    supabase status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in to Supabase"
    }
    Write-Host "✅ Supabase CLI logged in" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Not logged in to Supabase!" -ForegroundColor Red
    Write-Host "Please run: supabase login" -ForegroundColor Yellow
    exit 1
}

# Apply the emergency migration
Write-Host "📝 Applying emergency schema fix..." -ForegroundColor Cyan
supabase db push --include-all

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Emergency schema fix applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Verifying database schema..." -ForegroundColor Cyan
    
    # Verify the fix by checking if critical tables exist
    Write-Host "Checking companies table..." -ForegroundColor Yellow
    supabase db shell --command "SELECT COUNT(*) FROM companies;"
    
    Write-Host "Checking items table structure..." -ForegroundColor Yellow
    supabase db shell --command "SELECT column_name FROM information_schema.columns WHERE table_name = 'items' AND column_name IN ('company_id', 'sku');"
    
    Write-Host "Checking inventories table structure..." -ForegroundColor Yellow
    supabase db shell --command "SELECT column_name FROM information_schema.columns WHERE table_name = 'inventories' AND column_name = 'company_id';"
    
    Write-Host ""
    Write-Host "🎉 Database schema fix completed!" -ForegroundColor Green
    Write-Host "You can now redeploy your application to Render." -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Error applying emergency schema fix!" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
