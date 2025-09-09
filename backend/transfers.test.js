const request = require('supertest');
const { start } = require('./server');
const db = require('./src/db');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'tr@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'tr@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('transfer confirm creates double movement', async () => {
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'ItemX', sku: 'ITX' });
  expect(res.status).toBe(201);
  const itemId = res.body.id;

  res = await request(server)
    .post('/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'WH1' });
  const wh1 = res.body.id;
  res = await request(server)
    .post(`/warehouses/${wh1}/locations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'L1' });
  const loc1 = res.body.id;

  res = await request(server)
    .post('/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'WH2' });
  const wh2 = res.body.id;
  res = await request(server)
    .post(`/warehouses/${wh2}/locations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'L2' });
  const loc2 = res.body.id;

  res = await request(server)
    .post('/transfers')
    .set('Authorization', `Bearer ${token}`)
    .send({ item_id: itemId, source_location_id: loc1, dest_location_id: loc2, quantity: 5 });
  expect(res.status).toBe(201);
  const trId = res.body.id;

  res = await request(server)
    .post(`/transfers/${trId}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('done');
  const docId = res.body.document_id;

  const moves = await db.query('SELECT warehouse_id, quantity FROM stock_movements WHERE document_id=$1 ORDER BY quantity', [docId]);
  expect(moves.rows).toHaveLength(2);
  expect(moves.rows[0].quantity).toBe(-5);
  expect(moves.rows[1].quantity).toBe(5);
});
