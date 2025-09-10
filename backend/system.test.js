const request = require('supertest');
const { start } = require('./server');
let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'sys@test.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'sys@test.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('GET /system/status returns version', async () => {
  const res = await request(server)
    .get('/system/status')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.version).toBeDefined();
  expect(res.body.migrations).toBeDefined();
  expect(res.body.jobs).toBeDefined();
});
