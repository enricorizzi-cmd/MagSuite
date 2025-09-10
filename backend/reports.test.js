const request = require('supertest');
const db = require('./src/db');
let server;
let token;

beforeAll(async () => {
  process.env.USE_PG_MEM = 'true';
  const { start } = require('./server');
  server = await start(0);
  const password = 'Str0ng!Pass1';
  await request(server)
    .post('/auth/register')
    .send({ email: 'rep@example.com', password, company_id: 1 });
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'rep@example.com', password });
  token = login.body.accessToken;
  // seed data
  const item = await db.query("INSERT INTO items(name, sku, company_id) VALUES('Item A','A1',1) RETURNING id");
  await db.query('INSERT INTO warehouses(name) VALUES($1)', ['WH1']);
  await db.query(
    'INSERT INTO stock_movements(item_id, warehouse_id, quantity) VALUES($1,1,10)',
    [item.rows[0].id]
  );
  await db.query("INSERT INTO documents(type, status) VALUES('sale','confirmed')");
});

afterAll((done) => {
  server.close(done);
});

test('inventory report returns rows', async () => {
  const res = await request(server)
    .get('/reports/inventory')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.rows)).toBe(true);
});

test('views can be saved and listed', async () => {
  const save = await request(server)
    .post('/reports/inventory/views')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'test', filters: { warehouse: '1' } });
  expect(save.status).toBe(201);
  const list = await request(server)
    .get('/reports/inventory/views')
    .set('Authorization', `Bearer ${token}`);
  expect(list.body).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'test' })])
  );
});

test('report can be scheduled', async () => {
  const sched = await request(server)
    .post('/reports/inventory/schedule')
    .set('Authorization', `Bearer ${token}`)
    .send({ run_at: new Date().toISOString() });
  expect(sched.status).toBe(201);
});
