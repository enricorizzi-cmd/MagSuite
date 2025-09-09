const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'items@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'items@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('items CRUD lifecycle', async () => {
  // create
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Widget', sku: 'SKU1', lotti: true });
  expect(res.status).toBe(201);
  const id = res.body.id;
  expect(res.body.lotti).toBe(true);

  // read
  res = await request(server)
    .get(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Widget');

  // update
  res = await request(server)
    .put(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Gadget', sku: 'SKU2', seriali: true });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Gadget');
  expect(res.body.seriali).toBe(true);

  // delete
  res = await request(server)
    .delete(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);

  // verify deletion
  res = await request(server)
    .get(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test('validates required fields and formats', async () => {
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(400);

  res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bad', sku: 'SKU3', lotti: 'yes' });
  expect(res.status).toBe(400);

  res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Good', sku: 'SKU4' });
  const id = res.body.id;

  res = await request(server)
    .put(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ lotti: 'nope' });
  expect(res.status).toBe(400);
});

