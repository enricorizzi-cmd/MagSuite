const request = require('supertest');
const { start } = require('./server');
let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('GET /system/status returns version', async () => {
  const res = await request(server).get('/system/status');
  expect(res.status).toBe(200);
  expect(res.body.version).toBeDefined();
  expect(res.body.migrations).toBeDefined();
  expect(res.body.jobs).toBeDefined();
});

test('import log endpoints work', async () => {
  const csv = 'name\nFoo\n';
  const resImport = await request(server)
    .post('/imports/suppliers')
    .attach('file', Buffer.from(csv), 'test.csv');
  expect(resImport.status).toBe(200);
  const id = resImport.body.id;
  expect(id).toBeDefined();

  const resList = await request(server).get('/system/imports');
  expect(resList.status).toBe(200);
  expect(resList.body).toEqual(
    expect.arrayContaining([expect.objectContaining({ id })])
  );

  const resLog = await request(server).get(`/imports/${id}/log`);
  expect(resLog.status).toBe(200);
  expect(Array.isArray(resLog.body.log)).toBe(true);

  const resFile = await request(server).get(`/imports/${id}/file`);
  expect(resFile.status).toBe(200);
  expect(resFile.body.content).toBeDefined();
});

test('dry run does not store import and templates can be saved', async () => {
  const csv = 'name\nBar\n';
  const listBefore = await request(server).get('/system/imports');
  const countBefore = listBefore.body.length;
  const resDry = await request(server)
    .post('/imports/suppliers/dry-run')
    .attach('file', Buffer.from(csv), 'test.csv');
  expect(resDry.status).toBe(200);
  expect(Array.isArray(resDry.body.log)).toBe(true);
  const listAfter = await request(server).get('/system/imports');
  expect(listAfter.body.length).toBe(countBefore);

  const mapping = { name: 'name' };
  const resSave = await request(server)
    .post('/imports/templates/suppliers')
    .send({ name: 'tmpl', mapping });
  expect(resSave.status).toBe(201);
  const resTpl = await request(server).get('/imports/templates/suppliers');
  expect(resTpl.status).toBe(200);
  expect(resTpl.body).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'tmpl' })])
  );
});
