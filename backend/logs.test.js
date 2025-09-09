const request = require('supertest');
const { start } = require('./server');

let server;
let token;
let userId;

beforeAll(async () => {
  server = await start(0);
  const password = 'Str0ng!Pass1';
  const register = await request(server)
    .post('/auth/register')
    .send({ email: 'log@example.com', password });
  expect(register.status).toBe(201);
  userId = register.body.id;
  const login = await request(server)
    .post('/auth/login')
    .send({ email: 'log@example.com', password });
  expect(login.status).toBe(200);
  token = login.body.accessToken;
});

afterAll((done) => { server.close(done); });

test('logs capture diff for item update and can be consulted', async () => {
  const sku = `LSKU${Date.now()}`;
  let res = await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'WidgetLogs', sku });
  expect(res.status).toBe(201);
  const id = res.body.id;
  res = await request(server)
    .put(`/items/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'GadgetLogs' });
  expect(res.status).toBe(200);

  res = await request(server)
    .get('/logs')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  const entry = res.body.find(
    (e) => e.action === 'update_item' && e.diff?.name?.new === 'GadgetLogs'
  );
  expect(entry).toBeTruthy();
  expect(entry.userId).toBe(userId);
  expect(entry.diff.name.old).toBe('WidgetLogs');
  expect(entry.diff.name.new).toBe('GadgetLogs');
});
