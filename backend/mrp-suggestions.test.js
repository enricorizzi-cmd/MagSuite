const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'mrp@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'mrp@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('suggestions exclude inactive or supplierless items and compute requirement', async () => {
  const res = await request(server)
    .get('/mrp/suggestions')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body).toHaveLength(1);
  const s = res.body[0];
  expect(s.item).toBe('item-active');
  expect(s.rop).toBe(25);
  expect(s.suggested_qty).toBe(35);
});
