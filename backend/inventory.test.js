const request = require('supertest');
const { start } = require('./server');

let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('inventory lifecycle blocks movements and generates report', async () => {
  // create inventory
  let res = await request(server).post('/inventories').send({});
  expect(res.status).toBe(201);
  const invId = res.body.id;

  // freeze inventory
  res = await request(server).post(`/inventories/${invId}/freeze`).send();
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('frozen');

  // create document
  res = await request(server)
    .post('/documents')
    .send({ type: 'test', lines: [] });
  const docId = res.body.id;

  // confirming document should be blocked
  res = await request(server)
    .post(`/documents/${docId}/confirm`)
    .send({ movements: [] });
  expect(res.status).toBe(409);

  // close inventory
  res = await request(server).post(`/inventories/${invId}/close`).send();
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('closed');
  expect(res.body.report).toBeTruthy();
});
