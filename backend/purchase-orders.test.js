const request = require('supertest');
const { start } = require('./server');
const db = require('./src/db');
const { ready: docsReady } = require('./src/documents');
const { ready: lotsReady } = require('./src/lots');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  await docsReady;
  await lotsReady;
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'po@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'po@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('purchase conditions CRUD', async () => {
  let res = await request(server)
    .post('/purchase-conditions')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Standard', terms: '30 days' });
  expect(res.status).toBe(201);
  const id = res.body.id;

  res = await request(server)
    .get(`/purchase-conditions/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Standard');

  res = await request(server)
    .put(`/purchase-conditions/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Updated', terms: '60 days' });
  expect(res.body.name).toBe('Updated');

  res = await request(server)
    .delete(`/purchase-conditions/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);
});

test('supplier deletion works', async () => {
  let res = await request(server)
    .post('/suppliers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'ACME' });
  const id = res.body.id;
  res = await request(server)
    .delete(`/suppliers/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);
  res = await request(server)
    .get(`/suppliers/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test('order status transitions and linking to movements and lots', async () => {
  const cond = await db.query("INSERT INTO purchase_conditions(name) VALUES('Cond') RETURNING id");
  const condId = cond.rows[0].id;
  let res = await request(server)
    .post('/po')
    .set('Authorization', `Bearer ${token}`)
    .send({ supplier: 'S1', condition_id: condId, lines: [{ item: 'I1', qty: 1 }] });
  const poId = res.body.id;

  res = await request(server)
    .get(`/purchase-orders/${poId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.body.status).toBe('draft');

  res = await request(server)
    .patch(`/purchase-orders/${poId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'confirmed' });
  expect(res.body.status).toBe('confirmed');

  // setup lot and movement
  const itemRes = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Item1', sku: 'IT1' });
  const itemId = itemRes.body.id;
  const lotRes = await request(server)
    .post('/lots')
    .set('Authorization', `Bearer ${token}`)
    .send({ item_id: itemId, lot: 'L1' });
  const lotId = lotRes.body.id;
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('W1') RETURNING id");
  const whId = wh.rows[0].id;
  const move = await db.query(
    'INSERT INTO stock_movements(item_id, warehouse_id, quantity, lot_id) VALUES($1,$2,$3,$4) RETURNING id',
    [itemId, whId, 5, lotId]
  );
  const moveId = move.rows[0].id;

  const line = await db.query('SELECT id FROM purchase_order_lines WHERE po_id=$1 LIMIT 1', [poId]);
  const lineId = line.rows[0].id;

  res = await request(server)
    .patch(`/purchase-orders/${poId}/lines/${lineId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ lot_id: lotId, movement_id: moveId });
  expect(res.body.lot_id).toBe(lotId);
  expect(res.body.movement_id).toBe(moveId);

  res = await request(server)
    .get(`/purchase-orders/${poId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.body.lines[0].lot_id).toBe(lotId);
  expect(res.body.lines[0].movement_id).toBe(moveId);
});
