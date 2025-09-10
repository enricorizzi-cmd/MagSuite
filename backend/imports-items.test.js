const request = require('supertest');
const ExcelJS = require('exceljs');
const db = require('./src/db');
const { start } = require('./server');

let server;
let token1;
let token2;
let log1;
let log2;

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

  const r1 = await db.query(
    "INSERT INTO import_logs(type, filename, count, log, file, company_id) VALUES('items','a',1,'[]',NULL,1) RETURNING id"
  );
  const r2 = await db.query(
    "INSERT INTO import_logs(type, filename, count, log, file, company_id) VALUES('items','b',1,'[]',NULL,2) RETURNING id"
  );
  log1 = r1.rows[0].id;
  log2 = r2.rows[0].id;
});

afterAll((done) => {
  server.close(done);
});

test('items import dry run validates data', async () => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sheet1');
  ws.addRow(['Nome', 'UoM', 'Codice']);
  ws.addRow(['Widget', 'pcs', 'ABC123']);
  ws.addRow(['Gadget', 'bad', '@@@']);
  const buffer = await workbook.xlsx.writeBuffer();

  const mapping = { Nome: 'name', UoM: 'uom', Codice: 'code' };

  const resDry = await request(server)
    .post('/imports/items/dry-run')
    .set('Authorization', `Bearer ${token1}`)
    .field('mapping', JSON.stringify(mapping))
    .attach('file', buffer, 'test.xlsx');

  expect(resDry.status).toBe(200);
  expect(resDry.body.count).toBe(1);
  expect(resDry.body.log).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ line: 2, error: false }),
      expect.objectContaining({ line: 3, error: true, row: expect.any(Object) }),
    ])
  );
});

test('import logs are isolated by company', async () => {
  const forbidden = await request(server)
    .get(`/imports/${log1}/log`)
    .set('Authorization', `Bearer ${token2}`);
  expect(forbidden.status).toBe(404);
});

