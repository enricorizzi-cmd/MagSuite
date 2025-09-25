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
  expect(res.body).toEqual(
    expect.objectContaining({
      status: 'healthy',
      timestamp: expect.any(String),
      services: expect.objectContaining({
        database: expect.objectContaining({ status: expect.any(String) }),
        cache: expect.objectContaining({ status: expect.any(String) }),
        storage: expect.objectContaining({ status: expect.any(String) }),
        environment: expect.objectContaining({ status: expect.any(String) })
      }),
      system: expect.any(Object)
    })
  );
});
