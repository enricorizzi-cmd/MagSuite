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
    .send({ email: 'seq1@a.com', password, company_id: 1 });
  await request(server)
    .post('/auth/register')
    .send({ email: 'seq2@b.com', password, company_id: 2 });
  token1 = (
    await request(server).post('/auth/login').send({ email: 'seq1@a.com', password })
  ).body.accessToken;
  token2 = (
    await request(server).post('/auth/login').send({ email: 'seq2@b.com', password })
  ).body.accessToken;
});

afterAll((done) => {
  server.close(done);
});

test('sequences and causals are isolated by company', async () => {
  await request(server)
    .post('/sequences')
    .set('Authorization', `Bearer ${token1}`)
    .send({ name: 'Orders', prefix: 'A', next_number: 10 });
  await request(server)
    .post('/sequences')
    .set('Authorization', `Bearer ${token2}`)
    .send({ name: 'Orders', prefix: 'B', next_number: 20 });

  await request(server)
    .post('/causals')
    .set('Authorization', `Bearer ${token1}`)
    .send({ code: 'SALE', description: 'Sale', sign: -1 });
  await request(server)
    .post('/causals')
    .set('Authorization', `Bearer ${token2}`)
    .send({ code: 'SALE', description: 'Sale', sign: -1 });

  const seq1 = await request(server)
    .get('/sequences')
    .set('Authorization', `Bearer ${token1}`);
  const seq2 = await request(server)
    .get('/sequences')
    .set('Authorization', `Bearer ${token2}`);

  expect(seq1.body.items).toHaveLength(1);
  expect(seq2.body.items).toHaveLength(1);
  expect(seq1.body.items[0].next_number).toBe(10);
  expect(seq2.body.items[0].next_number).toBe(20);

  const preview = await request(server)
    .get(`/sequences/${seq1.body.items[0].id}/preview`)
    .set('Authorization', `Bearer ${token1}`);
  expect(preview.body.preview).toBe('A10');

  const caus1 = await request(server)
    .get('/causals')
    .set('Authorization', `Bearer ${token1}`);
  const caus2 = await request(server)
    .get('/causals')
    .set('Authorization', `Bearer ${token2}`);

  expect(caus1.body.items).toHaveLength(1);
  expect(caus2.body.items).toHaveLength(1);
  expect(caus1.body.items[0].code).toBe('SALE');
  expect(caus2.body.items[0].code).toBe('SALE');
});
