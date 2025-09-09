const request = require('supertest');
const { start } = require('../server');

let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('rejects invalid login', async () => {
  const email = 'fail@example.com';
  const password = 'secret';

  await request(server)
    .post('/auth/register')
    .send({ email, password, role: 'worker', warehouse_id: 1, company_id: 1 })
    .expect(201);

  const res = await request(server)
    .post('/auth/login')
    .send({ email, password: 'wrong' });
  expect(res.status).toBe(401);
});
