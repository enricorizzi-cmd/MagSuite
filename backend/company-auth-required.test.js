const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'nocomp@example.com', password });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'nocomp@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('items insert without company fails', async () => {
  const res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'NoCoItem' });
  expect(res.status).toBe(500);
});

test('sequences insert without company fails', async () => {
  const res = await request(server)
    .post('/sequences')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'OrderSeq' });
  expect(res.status).toBe(500);
});

test('causals insert without company fails', async () => {
  const res = await request(server)
    .post('/causals')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: 'SALE' });
  expect(res.status).toBe(500);
});
