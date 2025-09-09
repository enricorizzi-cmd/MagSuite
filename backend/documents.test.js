const request = require('supertest');
const { start } = require('./server');
const db = require('./src/db');
const { selectNextBatch, ready: docsReady } = require('./src/documents');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  await docsReady;
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'user@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'user@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('requires lot_id for lot-tracked items', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('Main') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'LotItem', lotti: true });
  const itemId = res.body.id;
  res = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'in', lines: [] });
  const docId = res.body.id;
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5 }] });
  expect(res.status).toBe(400);
  const lot = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'L1', '2030-01-01']
  );
  const lotId = lot.rows[0].id;
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5, lot_id: lotId }] });
  expect(res.status).toBe(200);
});

test('selectNextBatch applies FEFO and FIFO', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('W2') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'BatchItem', lotti: true });
  const itemId = res.body.id;
  const lot1 = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'A', '2030-01-01']
  );
  const lot2 = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'B', '2030-06-01']
  );
  await db.query(
    "INSERT INTO stock_movements(document_id,item_id,warehouse_id,quantity,lot_id,expiry,moved_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [null, itemId, warehouseId, 10, lot2.rows[0].id, '2030-06-01', '2024-01-02']
  );
  await db.query(
    "INSERT INTO stock_movements(document_id,item_id,warehouse_id,quantity,lot_id,expiry,moved_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [null, itemId, warehouseId, 10, lot1.rows[0].id, '2030-01-01', '2024-01-03']
  );
  process.env.BATCH_STRATEGY = 'FEFO';
  let batch = await selectNextBatch(itemId, warehouseId);
  expect(batch.lot_id).toBe(lot1.rows[0].id);
  process.env.BATCH_STRATEGY = 'FIFO';
  batch = await selectNextBatch(itemId, warehouseId);
  expect(batch.lot_id).toBe(lot2.rows[0].id);
});

test('rejects movements with insufficient quantity', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('W3') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'StockItem' });
  const itemId = res.body.id;
  // add initial stock
  let doc = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'in', lines: [] });
  await request(server)
    .post(`/documents/${doc.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5 }] });
  // attempt to withdraw more than available
  doc = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'out', lines: [] });
  res = await request(server)
    .post(`/documents/${doc.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: -6 }] });
  expect(res.status).toBe(409);
  // valid withdrawal
  res = await request(server)
    .post(`/documents/${doc.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: -5 }] });
  expect(res.status).toBe(200);
});

test('blocks movements on expired or blocked lots', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('W4') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'LotBlockItem', lotti: true });
  const itemId = res.body.id;
  const expiredLot = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'EXP', '2020-01-01']
  );
  const blockedLot = await db.query(
    "INSERT INTO lots(item_id, lot, expiry, blocked) VALUES($1,$2,$3,$4) RETURNING id",
    [itemId, 'BLK', '2030-01-01', true]
  );
  // expired lot
  let doc = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'in', lines: [] });
  res = await request(server)
    .post(`/documents/${doc.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5, lot_id: expiredLot.rows[0].id }] });
  expect(res.status).toBe(409);
  // blocked lot
  doc = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'in', lines: [] });
  res = await request(server)
    .post(`/documents/${doc.body.id}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5, lot_id: blockedLot.rows[0].id }] });
  expect(res.status).toBe(409);
});
