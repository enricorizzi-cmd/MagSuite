const request = require('supertest');
const { start } = require('./server');
let server;

beforeAll(async () => {
  server = await start(0);
});

afterAll((done) => {
  server.close(done);
});

test('items import validates uom and code and allows saving templates', async () => {
  const csv = 'Nome,UoM,Codice\nWidget,pcs,ABC123\nGadget,bad,@@@\n';
  const mapping = { Nome: 'name', UoM: 'uom', Codice: 'code' };
  const resDry = await request(server)
    .post('/imports/items/dry-run')
    .field('mapping', JSON.stringify(mapping))
    .attach('file', Buffer.from(csv), 'test.csv');
  expect(resDry.status).toBe(200);
  expect(resDry.body.count).toBe(1);
  expect(resDry.body.log).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ line: 2, error: false }),
      expect.objectContaining({ line: 3, error: true }),
    ])
  );

  const resSave = await request(server)
    .post('/imports/templates/items')
    .send({ name: 'itemsTpl', mapping });
  expect(resSave.status).toBe(201);
  const resTpl = await request(server).get('/imports/templates/items');
  expect(resTpl.status).toBe(200);
  expect(resTpl.body).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'itemsTpl' })])
  );
});
