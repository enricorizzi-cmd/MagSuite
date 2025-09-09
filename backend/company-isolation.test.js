const request = require('supertest');
const { start } = require('./server');

let server;
let token1;
let token2;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'a@a.com', password, company_id: 1 });
  await request(server)
    .post('/auth/register')
    .send({ email: 'b@b.com', password, company_id: 2 });
  const login1 = await request(server)
    .post('/auth/login')
    .send({ email: 'a@a.com', password });
  const login2 = await request(server)
    .post('/auth/login')
    .send({ email: 'b@b.com', password });
  token1 = login1.body.accessToken;
  token2 = login2.body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('company isolation for items', async () => {
  await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token1}`)
    .send({ name: 'ItemA' });

  await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token2}`)
    .send({ name: 'ItemB' });

  const res1 = await request(server)
    .get('/items')
    .set('Authorization', `Bearer ${token1}`);
  const res2 = await request(server)
    .get('/items')
    .set('Authorization', `Bearer ${token2}`);

  expect(res1.body.items).toHaveLength(1);
  expect(res1.body.items[0].name).toBe('ItemA');
  expect(res2.body.items).toHaveLength(1);
  expect(res2.body.items[0].name).toBe('ItemB');
});
