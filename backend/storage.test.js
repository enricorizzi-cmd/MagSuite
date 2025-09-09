const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { start } = require('./server');

let server;
let token1;
let token2;

beforeAll(async () => {
  fs.rmSync(path.join(__dirname, '..', 'uploads'), { recursive: true, force: true });
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'c1@c1.com', password, company_id: 1 });
  await request(server)
    .post('/auth/register')
    .send({ email: 'c2@c2.com', password, company_id: 2 });
  token1 = (
    await request(server)
      .post('/auth/login')
      .send({ email: 'c1@c1.com', password })
  ).body.accessToken;
  token2 = (
    await request(server)
      .post('/auth/login')
      .send({ email: 'c2@c2.com', password })
  ).body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('tenant isolated upload/download', async () => {
  await request(server)
    .post('/storage/upload')
    .set('Authorization', `Bearer ${token1}`)
    .attach('file', Buffer.from('file-one'), 'one.txt')
    .expect(201);

  await request(server)
    .post('/storage/upload')
    .set('Authorization', `Bearer ${token2}`)
    .attach('file', Buffer.from('file-two'), 'two.txt')
    .expect(201);

  const res1 = await request(server)
    .get('/storage/one.txt')
    .set('Authorization', `Bearer ${token1}`);
  expect(res1.status).toBe(200);
  expect(Buffer.from(res1.body.content, 'base64').toString()).toBe('file-one');

  const resForbidden1 = await request(server)
    .get('/storage/one.txt')
    .set('Authorization', `Bearer ${token2}`);
  expect(resForbidden1.status).toBe(404);

  const res2 = await request(server)
    .get('/storage/two.txt')
    .set('Authorization', `Bearer ${token2}`);
  expect(res2.status).toBe(200);
  expect(Buffer.from(res2.body.content, 'base64').toString()).toBe('file-two');

  const resForbidden2 = await request(server)
    .get('/storage/two.txt')
    .set('Authorization', `Bearer ${token1}`);
  expect(resForbidden2.status).toBe(404);
});
