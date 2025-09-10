const db = require('./src/db');
const companyContext = require('./src/companyContext');

test('parallel queries keep settings isolated per session', async () => {
  const q1 = companyContext.run({ companyId: 1 }, () =>
    db.query("select current_setting('app.current_company_id') as cid")
  );
  const q2 = companyContext.run({ companyId: 2 }, () =>
    db.query("select current_setting('app.current_company_id') as cid")
  );

  const [r1, r2] = await Promise.all([q1, q2]);
  expect(r1.rows[0].cid).toBe('1');
  expect(r2.rows[0].cid).toBe('2');
});

