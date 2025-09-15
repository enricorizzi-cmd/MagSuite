const fs = require('fs');
const path = require('path');

const filesToFix = [
  'imports.js',
  'suppliers.js', 
  'users.js',
  'items.js',
  'lots.js',
  'documents.js',
  'priceLists.js',
  'warehouses.js',
  'transfers.js',
  'sequences.js',
  'locations.js',
  'causals.js'
];

const fixFile = (filePath) => {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the problematic pattern with the fixed version
  const oldPattern = /\(async \(\) => \{[\s\S]*?await db\.query\(`CREATE TABLE IF NOT EXISTS (\w+) \([\s\S]*?company_id INTEGER NOT NULL DEFAULT NULLIF\(current_setting\('app\.current_company_id', true\), ''\)::int[\s\S]*?\)`\);[\s\S]*?await db\.query\('ALTER TABLE \1 ENABLE ROW LEVEL SECURITY'\);[\s\S]*?await db\.query\(`CREATE POLICY \1_select ON \1[\s\S]*?FOR SELECT USING \(company_id = current_setting\('app\.current_company_id', true\)::int\)`\);[\s\S]*?await db\.query\(`CREATE POLICY \1_insert ON \1[\s\S]*?FOR INSERT WITH CHECK \(company_id = current_setting\('app\.current_company_id', true\)::int\)`\);[\s\S]*?await db\.query\(`CREATE POLICY \1_update ON \1[\s\S]*?FOR UPDATE USING \(company_id = current_setting\('app\.current_company_id', true\)::int\)[\s\S]*?WITH CHECK \(company_id = current_setting\('app\.current_company_id', true\)::int\)`\);[\s\S]*?await db\.query\(`CREATE POLICY \1_delete ON \1[\s\S]*?FOR DELETE USING \(company_id = current_setting\('app\.current_company_id', true\)::int\)`\);[\s\S]*?\}\)\(\);/;
  
  const newPattern = `(async () => {
  try {
    // First ensure companies table exists
    await db.query(\`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        suspended BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    \`);
    
    // Insert default company
    await db.query(\`
      INSERT INTO companies (id, name) VALUES (1, 'Default Company') 
      ON CONFLICT (id) DO NOTHING
    \`);
    
    // Create $1 table with proper company_id
    await db.query(\`CREATE TABLE IF NOT EXISTS $1 (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1
    )\`);
    
    // Enable RLS and create policies
    await db.query('ALTER TABLE $1 ENABLE ROW LEVEL SECURITY');
    
    // Drop existing policies if they exist
    await db.query('DROP POLICY IF EXISTS $1_select ON $1');
    await db.query('DROP POLICY IF EXISTS $1_insert ON $1');
    await db.query('DROP POLICY IF EXISTS $1_update ON $1');
    await db.query('DROP POLICY IF EXISTS $1_delete ON $1');
    
    // Create new policies
    await db.query(\`CREATE POLICY $1_select ON $1
      FOR SELECT USING (company_id = COALESCE(current_setting('app.current_company_id', true)::int, 1))\`);
    await db.query(\`CREATE POLICY $1_insert ON $1
      FOR INSERT WITH CHECK (company_id = COALESCE(current_setting('app.current_company_id', true)::int, 1))\`);
    await db.query(\`CREATE POLICY $1_update ON $1
      FOR UPDATE USING (company_id = COALESCE(current_setting('app.current_company_id', true)::int, 1))
      WITH CHECK (company_id = COALESCE(current_setting('app.current_company_id', true)::int, 1))\`);
    await db.query(\`CREATE POLICY $1_delete ON $1
      FOR DELETE USING (company_id = COALESCE(current_setting('app.current_company_id', true)::int, 1))\`);
      
    console.log('$1 module initialized successfully');
  } catch (error) {
    console.error('Failed to initialize $1 module:', error);
  }
})();`;
  
  // Simple replacement for now - replace the problematic DEFAULT clause
  content = content.replace(
    /company_id INTEGER NOT NULL DEFAULT NULLIF\(current_setting\('app\.current_company_id', true\), ''\)::int/g,
    'company_id INTEGER REFERENCES companies(id) DEFAULT 1'
  );
  
  // Replace current_setting calls with COALESCE
  content = content.replace(
    /current_setting\('app\.current_company_id', true\)::int/g,
    'COALESCE(current_setting(\'app.current_company_id\', true)::int, 1)'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
};

// Fix all files
filesToFix.forEach(file => {
  const filePath = path.join(__dirname, 'src', file);
  if (fs.existsSync(filePath)) {
    fixFile(filePath);
  }
});

console.log('All files fixed!');

