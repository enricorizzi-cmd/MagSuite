const request = require('supertest');
const { start } = require('./server');
const { generateMfaToken } = require('./src/auth/mfa');

let server;

beforeAll(async () => {
  server = await start(0);
  // Seed a super admin so subsequent registrations don't get auto-promoted
  const seed = await require('supertest')(server)
    .post('/auth/register')
    .send({
      email: 'seed-admin@example.com',
      password: 'Str0ng!Pass1',
      role: 'admin',
      warehouse_id: 1,
      company_id: 1,
    });
  expect(seed.status).toBe(201);
});

afterAll((done) => {
  server.close(done);
});

test('register and login', async () => {
  const email = 'test@example.com';
  const password = 'Str0ng!Pass1';

  const register = await request(server)
    .post('/auth/register')
    .send({ email, password, role: 'worker', warehouse_id: 1, company_id: 1 });
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

test('custom permissions override role', async () => {
  const email = 'perm@example.com';
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({
      email,
      password,
      role: 'worker',
      warehouse_id: 1,
      company_id: 1,
      permissions: { inventory: ['write'] },
    })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .send({ email, password });
  const token = login.body.accessToken;
  const res = await request(server)
    .post('/warehouse/1/inventory')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(201);
});

test('login requires mfa when enabled', async () => {
  const email = 'mfa@example.com';
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email, password, role: 'worker', warehouse_id: 1, company_id: 1 })
    .expect(201);
  let login = await request(server).post('/auth/login').send({ email, password });
  const token = login.body.accessToken;
  const setup = await request(server)
    .post('/auth/mfa/setup')
    .set('Authorization', `Bearer ${token}`);
  const secret = setup.body.secret;
  login = await request(server).post('/auth/login').send({ email, password });
  expect(login.status).toBe(401);
  const mfaToken = generateMfaToken(secret);
  login = await request(server)
    .post('/auth/login')
    .send({ email, password, mfaToken });
  expect(login.status).toBe(200);
});
