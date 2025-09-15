#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista dei moduli da aggiornare
const modules = [
  'suppliers', 'warehouses', 'locations', 'lots', 'sequences', 
  'causals', 'priceLists', 'documents', 'transfers', 'inventories', 
  'imports', 'items', 'users'
];

// Template per le query aggiornate
const queryTemplates = {
  get: (tableName) => `
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'SELECT id, name FROM ${tableName} WHERE company_id = $1 ORDER BY id LIMIT $2 OFFSET $3',
    [companyId, limit, offset]
  );
  const totalRes = await db.query('SELECT COUNT(*) FROM ${tableName} WHERE company_id = $1', [companyId]);
  res.json({ items: result.rows, total: parseInt(totalRes.rows[0].count, 10) });
});`,
  
  getById: (tableName) => `
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const companyId = req.headers['x-company-id'] || 1;
  const result = await db.query('SELECT id, name FROM ${tableName} WHERE id=$1 AND company_id=$2', [id, companyId]);
  const item = result.rows[0];
  if (!item) return res.status(404).end();
  res.json(item);
});`,
  
  post: (tableName) => `
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'INSERT INTO ${tableName}(name, company_id) VALUES($1, $2) RETURNING id, name',
    [name, companyId]
  );
  res.status(201).json(result.rows[0]);
});`,
  
  put: (tableName) => `
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const companyId = req.headers['x-company-id'] || 1;
  
  const result = await db.query(
    'UPDATE ${tableName} SET name=$1 WHERE id=$2 AND company_id=$3 RETURNING id, name',
    [name, id, companyId]
  );
  const item = result.rows[0];
  if (!item) return res.status(404).end();
  res.json(item);
});`,
  
  delete: (tableName) => `
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const companyId = req.headers['x-company-id'] || 1;
  const result = await db.query('DELETE FROM ${tableName} WHERE id=$1 AND company_id=$2', [id, companyId]);
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});`
};

// Template per la creazione della tabella
const tableTemplate = (tableName) => `
    // Create ${tableName} table with company_id
    await db.query(\`CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      company_id INTEGER REFERENCES companies(id) DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )\`);`;

// Funzione per aggiornare un modulo
function updateModule(moduleName) {
  const filePath = path.join(__dirname, '..', 'src', `${moduleName}.js`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File ${moduleName}.js not found, skipping...`);
    return;
  }
  
  console.log(`🔧 Updating ${moduleName}.js...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Aggiorna la creazione della tabella
  const tableRegex = /\/\/ Create .*? table.*?\n\s*await db\.query\(`CREATE TABLE IF NOT EXISTS [^`]+`\);/gs;
  const newTableCreation = tableTemplate(moduleName);
  content = content.replace(tableRegex, newTableCreation);
  
  // Aggiorna le query per includere company_id
  const queries = ['get', 'getById', 'post', 'put', 'delete'];
  
  queries.forEach(queryType => {
    const template = queryTemplates[queryType](moduleName);
    const regex = new RegExp(`router\\.${queryType}\\([^}]+\\}\\);`, 'gs');
    
    if (content.match(regex)) {
      content = content.replace(regex, template);
    }
  });
  
  // Salva il file aggiornato
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${moduleName}.js`);
}

// Aggiorna tutti i moduli
console.log('🚀 Starting module updates...\n');

modules.forEach(updateModule);

console.log('\n🎉 All modules updated successfully!');
console.log('\n📋 Next steps:');
console.log('1. Test the database schema fixes');
console.log('2. Commit the changes');
console.log('3. Deploy to Render');
