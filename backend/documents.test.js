const request = require('supertest');
const { start } = require('./server');
const db = require('./db');
const { selectNextBatch, ready: docsReady } = require('./src/documents');

let server;

beforeAll(async () => {
  server = start(0);
  await docsReady;
});

afterAll((done) => {
  server.close(done);
});

test('requires lot_id for lot-tracked items', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('Main') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server).post('/items').send({ name: 'LotItem', lotti: true });
  const itemId = res.body.id;
  res = await request(server).post('/documents').send({ type: 'in', lines: [] });
  const docId = res.body.id;
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5 }] });
  expect(res.status).toBe(400);
  const lot = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'L1', '2025-01-01']
  );
  const lotId = lot.rows[0].id;
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .send({ movements: [{ item_id: itemId, warehouse_id: warehouseId, quantity: 5, lot_id: lotId }] });
  expect(res.status).toBe(200);
});

test('selectNextBatch applies FEFO and FIFO', async () => {
  const wh = await db.query("INSERT INTO warehouses(name) VALUES('W2') RETURNING id");
  const warehouseId = wh.rows[0].id;
  let res = await request(server).post('/items').send({ name: 'BatchItem', lotti: true });
  const itemId = res.body.id;
  const lot1 = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'A', '2024-01-01']
  );
  const lot2 = await db.query(
    "INSERT INTO lots(item_id, lot, expiry) VALUES($1,$2,$3) RETURNING id",
    [itemId, 'B', '2024-06-01']
  );
  await db.query(
    "INSERT INTO stock_movements(document_id,item_id,warehouse_id,quantity,lot_id,expiry,moved_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [null, itemId, warehouseId, 10, lot2.rows[0].id, '2024-06-01', '2024-01-02']
  );
  await db.query(
    "INSERT INTO stock_movements(document_id,item_id,warehouse_id,quantity,lot_id,expiry,moved_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [null, itemId, warehouseId, 10, lot1.rows[0].id, '2024-01-01', '2024-01-03']
  );
  process.env.BATCH_STRATEGY = 'FEFO';
  let batch = await selectNextBatch(itemId, warehouseId);
  expect(batch.lot_id).toBe(lot1.rows[0].id);
  process.env.BATCH_STRATEGY = 'FIFO';
  batch = await selectNextBatch(itemId, warehouseId);
  expect(batch.lot_id).toBe(lot2.rows[0].id);
});
