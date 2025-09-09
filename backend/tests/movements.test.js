const request = require('supertest');
const db = require('../src/db');
const { start } = require('../server');
const { ready } = require('../src/documents');

let server;
let token;
let itemId;

beforeAll(async () => {
  await ready;
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'move@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'move@example.com', password });
  token = login.body.accessToken;
  const itemRes = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Item' });
  itemId = itemRes.body.id;
  await db.query("INSERT INTO warehouses(id, name) VALUES (1, 'Main')");
  await db.query("INSERT INTO documents(id, type, status) VALUES (1, 'receipt', 'draft')");
});

afterAll((done) => {
  server.close(done);
});

test('confirming document records movement', async () => {
  const res = await request(server)
    .post('/documents/1/confirm')
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [{ item_id: itemId, warehouse_id: 1, quantity: 5 }] });
  expect(res.status).toBe(200);
  const { rows } = await db.query('SELECT quantity FROM stock_movements WHERE document_id=1');
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].quantity)).toBe(5);
});
