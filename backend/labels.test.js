const request = require('supertest');
const { start } = require('./server');

let server;
let token;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'labels@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'labels@example.com', password });
  token = login.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('generates png label with code128 barcode', async () => {
  const res = await request(server)
    .get('/labels/standard')
    .set('Authorization', `Bearer ${token}`)
    .query({ code: '123456789012', type: 'code128', format: 'png', text: 'Example' });
  expect(res.status).toBe(200);
  expect(res.body.content).toBeDefined();
});

test('batch generates pdf labels', async () => {
  const res = await request(server)
    .post('/labels/standard/batch')
    .set('Authorization', `Bearer ${token}`)
    .send({
      format: 'pdf',
      items: [
        { code: '123456789012', type: 'ean13', text: 'A' },
        { code: '987654321098', type: 'upca', text: 'B' }
      ]
    });
  expect(res.status).toBe(200);
  expect(res.body.content).toBeDefined();
});
