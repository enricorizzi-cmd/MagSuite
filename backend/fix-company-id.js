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

