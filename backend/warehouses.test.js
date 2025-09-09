const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'wh@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'wh@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('warehouses and locations CRUD with tree and QR', async () => {
  let res = await request(server)
    .post('/warehouses')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Main' });
  expect(res.status).toBe(201);
  const whId = res.body.id;

  res = await request(server)
    .post(`/warehouses/${whId}/locations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'A' });
  expect(res.status).toBe(201);
  const locA = res.body.id;

  res = await request(server)
    .post(`/warehouses/${whId}/locations`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'A1', parent_id: locA });
  expect(res.status).toBe(201);
  const locA1 = res.body.id;

  res = await request(server)
    .get(`/warehouses/${whId}/locations`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.items[0].children[0].id).toBe(locA1);

  res = await request(server)
    .put(`/locations/${locA1}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'A1b' });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('A1b');

  res = await request(server)
    .get(`/locations/${locA1}/label`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/pdf/);

  res = await request(server)
    .delete(`/locations/${locA1}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);

  res = await request(server)
    .delete(`/warehouses/${whId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);
});
