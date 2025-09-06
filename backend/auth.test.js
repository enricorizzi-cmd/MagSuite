const request = require('supertest');
const { start } = require('./server');

let server;

beforeAll(() => {
  server = start(0);
});

afterAll((done) => {
  server.close(done);
});

test('register and login', async () => {
  const email = 'test@example.com';
  const password = 'secret';

  const register = await request(server)
    .post('/auth/register')
    .send({ email, password, role: 'worker', warehouse_id: 1 });
  expect(register.status).toBe(201);

  const login = await request(server)
    .post('/auth/login')
    .send({ email, password });
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeDefined();

  const token = login.body.accessToken;

  const ok = await request(server)
    .get('/warehouse/1/inventory')
    .set('Authorization', `Bearer ${token}`);
  expect(ok.status).toBe(200);

  const wrongWarehouse = await request(server)
    .get('/warehouse/2/inventory')
    .set('Authorization', `Bearer ${token}`);
  expect(wrongWarehouse.status).toBe(403);

  const forbidden = await request(server)
    .post('/warehouse/1/inventory')
    .set('Authorization', `Bearer ${token}`);
  expect(forbidden.status).toBe(403);
});
