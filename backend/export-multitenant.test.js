const request = require('supertest');
const ExcelJS = require('exceljs');
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

test('export respects company isolation', async () => {
  await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token1}`)
    .send({ name: 'ItemA', sku: 'A1' });
  await request(server)
    .post('/items')
    .set('Authorization', `Bearer ${token2}`)
    .send({ name: 'ItemB', sku: 'B1' });

  const csvRes = await request(server)
    .get('/items/export?columns=name&format=csv')
    .set('Authorization', `Bearer ${token1}`);

  expect(csvRes.text).toContain('ItemA');
  expect(csvRes.text).not.toContain('ItemB');

  const xlsxRes = await request(server)
    .get('/items/export?columns=name&format=xlsx')
    .set('Authorization', `Bearer ${token2}`)
    .buffer()
    .parse((res, cb) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsxRes.body);
  const ws = wb.getWorksheet(1);
  expect(ws.getCell('A2').value).toBe('ItemB');
});
