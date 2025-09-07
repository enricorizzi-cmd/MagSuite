const request = require('supertest');
const db = require('../src/db');
const { start } = require('../server');
const { ready } = require('../src/documents');

let server;

beforeAll(async () => {
  await ready;
  server = start(0);
  await db.query("INSERT INTO items(id, name) VALUES (1, 'Item')");
  await db.query("INSERT INTO warehouses(id, name) VALUES (1, 'Main')");
  await db.query("INSERT INTO documents(id, type, status) VALUES (1, 'receipt', 'draft')");
});

afterAll((done) => {
  server.close(done);
});

test('confirming document records movement', async () => {
  const res = await request(server)
    .post('/documents/1/confirm')
    .send({ movements: [{ item_id: 1, warehouse_id: 1, quantity: 5 }] });
  expect(res.status).toBe(200);
  const { rows } = await db.query('SELECT quantity FROM stock_movements WHERE document_id=1');
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].quantity)).toBe(5);
});
