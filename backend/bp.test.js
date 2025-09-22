const request = require("supertest");
const { start } = require("./server");
const db = require("./src/db");

let server;
let token;
let customerId;
let userId;

beforeAll(async () => {
  server = await start(0);
  const createTables = [
    `CREATE TABLE IF NOT EXISTS bp_consultants (
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      grade TEXT DEFAULT 'junior',
      bp_role TEXT DEFAULT 'consultant',
      default_view TEXT DEFAULT 'dashboard',
      preferences JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (company_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS bp_clients (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      consultant_id INTEGER,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lead',
      last_appointment_at TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS bp_appointments (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      client_id TEXT,
      client_name TEXT NOT NULL,
      appointment_type TEXT NOT NULL,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ,
      duration_minutes INTEGER NOT NULL,
      vss NUMERIC(12,2) DEFAULT 0,
      vsd_personal NUMERIC(12,2) DEFAULT 0,
      vsd_indiretto NUMERIC(12,2) DEFAULT 0,
      telefonate INTEGER DEFAULT 0,
      app_fissati INTEGER DEFAULT 0,
      nncf BOOLEAN DEFAULT FALSE,
      nncf_prompt_answered BOOLEAN DEFAULT FALSE,
      notes TEXT,
      extra JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS bp_sales (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      consultant_id INTEGER,
      client_id TEXT,
      appointment_id TEXT,
      client_name TEXT,
      sale_date DATE NOT NULL,
      services TEXT,
      vss_total NUMERIC(12,2) DEFAULT 0,
      schedule JSONB DEFAULT '[]'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS bp_periods (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      period_type TEXT NOT NULL,
      mode TEXT DEFAULT 'consuntivo',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      indicators_prev JSONB DEFAULT '{}'::jsonb,
      indicators_cons JSONB DEFAULT '{}'::jsonb,
      totals JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS bp_settings (
      company_id INTEGER PRIMARY KEY,
      indicators TEXT[] DEFAULT ARRAY[]::TEXT[],
      weights JSONB DEFAULT '{}'::jsonb,
      commissions JSONB DEFAULT '{}'::jsonb,
      config JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS bp_report_recipients (
      company_id INTEGER PRIMARY KEY,
      recipients_to TEXT[] DEFAULT ARRAY[]::TEXT[],
      recipients_cc TEXT[] DEFAULT ARRAY[]::TEXT[],
      recipients_bcc TEXT[] DEFAULT ARRAY[]::TEXT[],
      updated_at TIMESTAMPTZ DEFAULT now()
    )`
  ];
  for (const ddl of createTables) {
    await db.query(ddl);
  }

  const password = "Str0ng!Pass1";
  await request(server)
    .post("/auth/register")
    .send({ email: "bp-admin@example.com", password, company_id: 1 });
  await db.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT(name) DO NOTHING");

  await db.query("UPDATE users SET role_id = (SELECT id FROM roles WHERE name='admin') WHERE email = $1", ["bp-admin@example.com"]);
  const login = await request(server)
    .post("/auth/login")
    .send({ email: "bp-admin@example.com", password });
  token = login.body.accessToken;
  const userRow = await db.query("SELECT id FROM users WHERE email = $1", ["bp-admin@example.com"]);
  userId = userRow.rows[0].id;
  const customer = await db.query(
    "INSERT INTO customers(code, name, company_id) VALUES($1,$2,$3) RETURNING id",
    ["BP001", "BP Example Client", 1]
  );
  customerId = customer.rows[0].id;
  await db.query(
    `INSERT INTO bp_consultants(company_id, user_id, grade, bp_role, default_view, preferences, created_at, updated_at)
     VALUES($1,$2,'senior','manager','dashboard',$3,now(),now())
     ON CONFLICT(company_id, user_id) DO NOTHING`,
    [1, userId, {}]
  );
});

afterAll((done) => {
  server.close(done);
});

test("creates client linked to existing anagrafica", async () => {
  const res = await request(server)
    .post("/bp/clients")
    .set("Authorization", `Bearer ${token}`)
    .send({ customer_id: customerId, status: "attivo" });
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ customer_id: customerId, status: "attivo" });
});

test("lists clients with status and linkage", async () => {
  const res = await request(server)
    .get("/bp/clients")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
  const client = res.body.items.find((c) => c.customer_id === customerId);
  expect(client).toBeTruthy();
  expect(client.status).toBe("attivo");
});

test("records appointment and returns it in listing", async () => {
  const res = await request(server)
    .post("/bp/appointments")
    .set("Authorization", `Bearer ${token}`)
    .send({
      customer_id: customerId,
      start_at: "2025-09-01T10:00:00.000Z",
      duration_minutes: 60,
      appointment_type: "telefonata",
      vss: 150,
      vsd_personal: 200,
      notes: "Intro call"
    });
  expect(res.status).toBe(201);
  const list = await request(server)
    .get("/bp/appointments")
    .set("Authorization", `Bearer ${token}`);
  expect(list.status).toBe(200);
  expect(list.body.items.some((item) => item.client_id)).toBe(true);
});

test("records sale and aggregates in dashboard", async () => {
  const res = await request(server)
    .post("/bp/sales")
    .set("Authorization", `Bearer ${token}`)
    .send({
      customer_id: customerId,
      sale_date: "2025-09-02",
      vss_total: 1200,
      services: "Coaching",
      schedule: [
        { dueDate: "2025-09-10", amount: 600 },
        { dueDate: "2025-10-10", amount: 600 }
      ]
    });
  expect(res.status).toBe(201);
  const dashboard = await request(server)
    .get("/bp/dashboard")
    .set("Authorization", `Bearer ${token}`);
  expect(dashboard.status).toBe(200);
  expect(dashboard.body).toHaveProperty("kpis");
  expect(Array.isArray(dashboard.body.agenda)).toBe(true);
});

test("stores commission weights and leaderboard", async () => {
  await request(server)
    .post("/bp/periods")
    .set("Authorization", `Bearer ${token}`)
    .send({
      user_id: userId,
      period_type: "mensile",
      start_date: "2025-09-01",
      end_date: "2025-09-30",
      totals: { VSS: 1000 }
    });
  const leaderboardRes = await request(server)
    .get("/bp/leaderboard")
    .set("Authorization", `Bearer ${token}`);
  expect(leaderboardRes.status).toBe(200);
  expect(Array.isArray(leaderboardRes.body.entries)).toBe(true);
});

test("saves settings and report recipients", async () => {
  const res = await request(server)
    .put("/bp/settings")
    .set("Authorization", `Bearer ${token}`)
    .send({ indicators: ["VSS", "AppFatti"], commissions: { gi: 0.2, vsdJunior: 0.3, vsdSenior: 0.35 } });
  expect(res.status).toBe(200);
  const recipients = await request(server)
    .put("/bp/report-recipients")
    .set("Authorization", `Bearer ${token}`)
    .send({ to: ["direzione@example.com"] });
  expect(recipients.status).toBe(200);
  const settingsRes = await request(server)
    .get("/bp/settings")
    .set("Authorization", `Bearer ${token}`);
  expect(settingsRes.body.settings.indicators).toContain("VSS");
  expect(settingsRes.body.recipients.to).toContain("direzione@example.com");
});

