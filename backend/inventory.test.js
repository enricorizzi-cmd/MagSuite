const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'inv@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'inv@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('inventory lifecycle blocks movements and generates report', async () => {
  // create inventory
  let res = await request(server)
    .post('/inventories')
    .set('Authorization', `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(201);
  const invId = res.body.id;

  // freeze inventory
  res = await request(server)
    .post(`/inventories/${invId}/freeze`)
    .set('Authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('frozen');

  // create document
  res = await request(server)
    .post('/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'test', lines: [] });
  const docId = res.body.id;

  // confirming document should be blocked
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ movements: [] });
  expect(res.status).toBe(409);

  // close inventory
  res = await request(server)
    .post(`/inventories/${invId}/close`)
    .set('Authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('closed');
  expect(res.body.report).toBeTruthy();
});
