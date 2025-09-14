const express = require('express');
const db = require('./db');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    warehouse_id INTEGER REFERENCES warehouses(id),
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int
  )`);
  
  // Enable RLS and create policies
  await db.query('ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY');
  await db.query(`CREATE POLICY IF NOT EXISTS user_settings_select ON user_settings
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS user_settings_insert ON user_settings
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS user_settings_update ON user_settings
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS user_settings_delete ON user_settings
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int)`);
})();

router.get('/', async (req, res) => {
  const result = await db.query(
    "SELECT id, name, role, warehouse_id FROM user_settings WHERE company_id = NULLIF(current_setting('app.current_company_id', true), '')::int ORDER BY id"
  );
  const users = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    warehouseId: row.warehouse_id,
  }));
  res.json({ users });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "SELECT id, name, role, warehouse_id FROM user_settings WHERE id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int",
    [id]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).end();
  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    warehouseId: user.warehouse_id,
  });
});

router.post('/', async (req, res) => {
  const { name, role = 'user', warehouseId = null } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    'INSERT INTO user_settings(name, role, warehouse_id) VALUES($1,$2,$3) RETURNING id, name, role, warehouse_id',
    [name, role, warehouseId]
  );
  const user = result.rows[0];
  res.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
    warehouseId: user.warehouse_id,
  });
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, role = 'user', warehouseId = null } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name required' });
  }
  const result = await db.query(
    "UPDATE user_settings SET name=$1, role=$2, warehouse_id=$3 WHERE id=$4 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int RETURNING id, name, role, warehouse_id",
    [name, role, warehouseId, id]
  );
  const user = result.rows[0];
  if (!user) return res.status(404).end();
  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    warehouseId: user.warehouse_id,
  });
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    "DELETE FROM user_settings WHERE id=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int",
    [id]
  );
  if (result.rowCount === 0) return res.status(404).end();
  res.status(204).send();
});

module.exports = { router };

