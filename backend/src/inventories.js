const express = require('express');
const db = require('./db');
const { authenticateToken, rbac } = require('./auth');

const router = express.Router();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS inventories (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL,
    scope JSONB,
    counts JSONB DEFAULT '[]',
    differences JSONB DEFAULT '[]',
    delta JSONB DEFAULT '[]',
    approvals JSONB DEFAULT '[]',
    audit JSONB DEFAULT '[]',
    company_id INTEGER NOT NULL DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  
  // Enable RLS and create policies
  await db.query('ALTER TABLE inventories ENABLE ROW LEVEL SECURITY');
  await db.query(`CREATE POLICY inventories_select ON inventories
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY inventories_insert ON inventories
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY inventories_update ON inventories
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY inventories_delete ON inventories
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int)`);
})();

router.get('/inventories', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = parseInt(req.query.offset) || 0;
  const result = await db.query(
    'SELECT * FROM inventories ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ items: result.rows });
});

router.post('/inventories', async (req, res) => {
  const scope = req.body.scope ? JSON.stringify(req.body.scope) : null;
  const result = await db.query(
    'INSERT INTO inventories(status, scope) VALUES($1, $2::jsonb) RETURNING *',
    ['open', scope]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/inventories/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT * FROM inventories WHERE id=$1', [id]);
  const inv = result.rows[0];
  if (!inv) return res.status(404).end();
  res.json(inv);
});

router.post(
  '/inventories/:id/freeze',
  authenticateToken,
  rbac('inventory', 'write'),
  async (req, res) => {
    const id = Number(req.params.id);
    const invRes = await db.query('SELECT audit FROM inventories WHERE id=$1', [id]);
    const existing = invRes.rows[0];
    if (!existing) return res.status(404).end();
    const audit = (existing.audit || []).concat({
      action: 'freeze',
      user: req.user.id,
      at: new Date().toISOString(),
    });
    const result = await db.query(
      'UPDATE inventories SET status=$1, audit=$2::jsonb WHERE id=$3 RETURNING status',
      ['frozen', JSON.stringify(audit), id]
    );
    res.json({ status: result.rows[0].status });
  }
);

router.post(
  '/inventories/:id/counts',
  authenticateToken,
  rbac('inventory', 'write'),
  async (req, res) => {
    const id = Number(req.params.id);
    const counts = req.body.counts || [];
    const invRes = await db.query('SELECT scope, audit FROM inventories WHERE id=$1', [id]);
    const inv = invRes.rows[0];
    if (!inv) return res.status(404).end();
    const scope = inv.scope || [];
    const differences = scope.map((s) => {
      const counted = counts.find((c) => c.item_id === s.item_id)?.count || 0;
      return {
        item_id: s.item_id,
        expected: s.expected || 0,
        counted,
        delta: counted - (s.expected || 0),
      };
    });
    const delta = differences
      .filter((d) => d.delta !== 0)
      .map((d) => ({ item_id: d.item_id, quantity: d.delta }));
    const audit = (inv.audit || []).concat({
      action: 'count',
      user: req.user.id,
      at: new Date().toISOString(),
    });
    await db.query(
      'UPDATE inventories SET counts=$1::jsonb, differences=$2::jsonb, delta=$3::jsonb, audit=$4::jsonb WHERE id=$5',
      [JSON.stringify(counts), JSON.stringify(differences), JSON.stringify(delta), JSON.stringify(audit), id]
    );
    res.json({ counts, differences, delta });
  }
);

router.post(
  '/inventories/:id/approve',
  authenticateToken,
  rbac('inventory', 'write'),
  async (req, res) => {
    const id = Number(req.params.id);
    const userId = req.user.id;
    const invRes = await db.query('SELECT approvals, audit FROM inventories WHERE id=$1', [id]);
    const inv = invRes.rows[0];
    if (!inv) return res.status(404).end();
    const approvals = inv.approvals || [];
    if (approvals.includes(userId)) return res.status(409).json({ error: 'Already approved' });
    approvals.push(userId);
    const audit = (inv.audit || []).concat({
      action: 'approve',
      user: userId,
      at: new Date().toISOString(),
    });
    await db.query('UPDATE inventories SET approvals=$1::jsonb, audit=$2::jsonb WHERE id=$3', [
      JSON.stringify(approvals),
      JSON.stringify(audit),
      id,
    ]);
    res.json({ approvals });
  }
);

router.post(
  '/inventories/:id/close',
  authenticateToken,
  rbac('inventory', 'write'),
  async (req, res) => {
    const id = Number(req.params.id);
    const invRes = await db.query('SELECT approvals, audit, delta FROM inventories WHERE id=$1', [id]);
    const inv = invRes.rows[0];
    if (!inv) return res.status(404).end();
    if ((inv.approvals || []).length < 2) {
      return res.status(403).json({ error: 'Two approvals required' });
    }
    const audit = (inv.audit || []).concat({
      action: 'close',
      user: req.user.id,
      at: new Date().toISOString(),
    });
    const result = await db.query(
      'UPDATE inventories SET status=$1, audit=$2::jsonb WHERE id=$3 RETURNING status, delta',
      ['closed', JSON.stringify(audit), id]
    );
    const updated = result.rows[0];
    const report = Buffer.from('inventory report').toString('base64');
    res.json({ status: updated.status, delta: updated.delta || [], report });
  }
);

router.get(
  '/warehouse/:warehouse_id/inventory',
  authenticateToken,
  rbac('inventory', 'read'),
  (req, res) => {
    res.json({ items: [] });
  }
);

router.post(
  '/warehouse/:warehouse_id/inventory',
  authenticateToken,
  rbac('inventory', 'write'),
  (req, res) => {
    res.status(201).json({ status: 'created' });
  }
);

module.exports = { router };
