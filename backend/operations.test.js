const request = require('supertest');
const jwt = require('jsonwebtoken');
const { start } = require('./server');
const events = require('./src/events');

let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('order endpoint emits event', async () => {
  const eventPromise = new Promise((resolve) => events.once('order.created', resolve));
  const res = await request(server)
    .post('/orders')
    .set('x-api-key', process.env.API_KEY)
    .set('x-company-id', '1')
    .send({ item: 'Widget', qty: 5 });
  expect(res.status).toBe(201);
  const evt = await eventPromise;
  expect(evt.item).toBe('Widget');
});

test('movement and inventory endpoints emit events', async () => {
  const movePromise = new Promise((resolve) => events.once('movement', resolve));
  const invPromise = new Promise((resolve) => events.once('inventory.updated', resolve));

  await request(server)
    .post('/movements')
    .set('x-api-key', process.env.API_KEY)
    .set('x-company-id', '1')
    .send({ sku: 'A1', qty: 1 });
  await request(server)
    .post('/inventory')
    .set('x-api-key', process.env.API_KEY)
    .set('x-company-id', '1')
    .send({ sku: 'A1' });

  const move = await movePromise;
  const inv = await invPromise;
  expect(move.qty).toBe(1);
  expect(inv.sku).toBe('A1');
});

test('accepts SSO token', async () => {
  const token = jwt.sign({ company_id: 1 }, process.env.SSO_SECRET);
  const res = await request(server)
    .post('/orders')
    .set('x-sso-token', token)
    .send({ item: 'SSO', qty: 1 });
  expect(res.status).toBe(201);
});
