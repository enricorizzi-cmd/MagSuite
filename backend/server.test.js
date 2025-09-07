const request = require('supertest');
const { start } = require('./server');

let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('GET /health returns ok status', async () => {
  const res = await request(server).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
