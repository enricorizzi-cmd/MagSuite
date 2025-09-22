#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const db = require('./backend/src/db');
const companyContext = require('./backend/src/companyContext');

const readFile = promisify(fs.readFile);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { company: 1, dataDir: path.resolve('BPApp_extracted/BPApp/backend/data'), truncate: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--company' || arg === '-c') {
      options.company = Number(args[++i]);
    } else if (arg === '--data-dir' || arg === '-d') {
      options.dataDir = path.resolve(args[++i]);
    } else if (arg === '--truncate') {
      options.truncate = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(Usage: node scripts/import-bpapp.js [options]
  --company, -c     Target company id (default 1)
  --data-dir, -d    Path to BPApp backup data directory
  --truncate        Remove existing BP data before import
  --dry-run         Run without writing to the database);
      process.exit(0);
    }
  }
  if (!Number.isInteger(options.company) || options.company <= 0) {
    throw new Error('Company id must be a positive integer');
  }
  if (!fs.existsSync(options.dataDir)) {
    throw new Error(Data directory not found: );
  }
  return options;
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (fallback != null) return fallback;
    throw new Error(Unable to read JSON file : );
  }
}

function normaliseName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toIso(value) {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
}

async function withCompanyContext(companyId, fn) {
  return companyContext.run({ companyId }, fn);
}

async function fetchMap(sql, keySelector, valueSelector) {
  const map = new Map();
  const { rows } = await db.query(sql);
  rows.forEach((row) => {
    map.set(keySelector(row), valueSelector(row));
  });
  return map;
}

async function buildUserMap(companyId, usersData) {
  const emailToUserId = await fetchMap(
    {
      text: 'SELECT id, email FROM users WHERE company_id = ',
      values: [companyId]
    },
    (row) => normaliseName(row.email),
    (row) => row.id
  );
  const map = new Map();
  usersData.users.forEach((user) => {
    const match = emailToUserId.get(normaliseName(user.email));
    if (match) {
      map.set(user.id, { newId: match, grade: user.grade || 'junior', role: user.role || 'consultant', name: user.name });
    }
  });
  return map;
}

async function ensureConsultant(companyId, mapping, dryRun) {
  if (!mapping) return;
  if (dryRun) return;
  await db.query(
    INSERT INTO bp_consultants(company_id, user_id, grade, bp_role, default_view, preferences, created_at, updated_at)
     VALUES(,,,,,,now(),now())
     ON CONFLICT(company_id, user_id) DO UPDATE SET
       grade = EXCLUDED.grade,
       bp_role = EXCLUDED.bp_role,
       updated_at = now(),
    [companyId, mapping.newId, mapping.grade || 'junior', mapping.role || 'consultant', 'dashboard', {}]
  );
}

async function buildCustomerMap(companyId) {
  const { rows } = await db.query(
    {
      text: 'SELECT id, lower(name) AS name FROM customers WHERE company_id = ',
      values: [companyId]
    }
  );
  const map = new Map();
  rows.forEach((row) => {
    map.set(row.name, row.id);
  });
  return map;
}

async function ensureClient(companyId, customerId, payload, dryRun) {
  if (!customerId) return null;
  const now = new Date();
  if (dryRun) {
    return (payload && payload.id) || null;
  }
  const result = await db.query(
    INSERT INTO bp_clients(id, company_id, consultant_id, customer_id, name, status, metadata, last_appointment_at, created_at, updated_at)
     VALUES(,,,,,,,,now(),now())
     ON CONFLICT (company_id, customer_id) DO UPDATE SET
       consultant_id = EXCLUDED.consultant_id,
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       metadata = COALESCE(bp_clients.metadata, '{}'::jsonb) || EXCLUDED.metadata,
       last_appointment_at = COALESCE(EXCLUDED.last_appointment_at, bp_clients.last_appointment_at),
       updated_at = now()
     RETURNING id,
    [payload?.id || customerId.toString(), companyId, payload?.consultantId || null, customerId, payload?.name || '', payload?.status || 'lead', payload?.metadata || {}, payload?.lastAppointmentAt || null]
  );
  return result.rows[0]?.id || null;
}

async function importClients(companyId, clientsData, customerMap, userMap, dryRun) {
  const stats = { total: 0, imported: 0, skipped: 0 };
  const mapping = new Map();
  if (!clientsData?.clients) return { stats, mapping };
  for (const client of clientsData.clients) {
    stats.total += 1;
    const customerId = customerMap.get(normaliseName(client.name));
    if (!customerId) {
      stats.skipped += 1;
      console.warn([clients] Skipping '' - no matching customer in MagSuite);
      continue;
    }
    const consultant = client.consultantId ? userMap.get(client.consultantId) : null;
    const payload = {
      id: client.id,
      consultantId: consultant?.newId || null,
      name: client.name,
      status: client.status || 'lead',
      lastAppointmentAt: toIso(client.lastAppointmentAt),
      metadata: {}
    };
    if (!dryRun) {
      const id = await ensureClient(companyId, customerId, payload, dryRun);
      mapping.set(client.id, { clientId: id, customerId });
      stats.imported += 1;
    } else {
      mapping.set(client.id, { clientId: client.id, customerId });
      stats.imported += 1;
    }
  }
  return { stats, mapping };
}

function deriveEnd(start, end, durationMinutes) {
  const startDate = parseDate(start);
  if (!startDate) return null;
  const endDate = parseDate(end);
  if (endDate) return endDate.toISOString();
  const duration = Number(durationMinutes);
  if (Number.isFinite(duration) && duration > 0) {
    const computed = new Date(startDate.getTime() + duration * 60000);
    return computed.toISOString();
  }
  const fallback = new Date(startDate.getTime() + 90 * 60000);
  return fallback.toISOString();
}

async function importAppointments(companyId, appointmentsData, clientMap, userMap, dryRun) {
  const stats = { total: 0, imported: 0, skipped: 0 };
  if (!appointmentsData?.appointments) return stats;
  for (const appointment of appointmentsData.appointments) {
    stats.total += 1;
    const user = userMap.get(appointment.userId);
    if (!user) {
      stats.skipped += 1;
      console.warn([appointments] Skipping  - unknown user );
      continue;
    }
    let clientInfo = null;
    if (appointment.clientId) {
      clientInfo = clientMap.get(appointment.clientId);
    }
    if (!clientInfo && appointment.client) {
      clientInfo = clientMap.get(normaliseName(appointment.client));
    }
    if (!clientInfo) {
      stats.skipped += 1;
      console.warn([appointments] Skipping  - no matching client '');
      continue;
    }
    if (dryRun) {
      stats.imported += 1;
      continue;
    }
    await db.query(
      INSERT INTO bp_appointments(
         id, company_id, user_id, client_id, client_name,
         appointment_type, start_at, end_at, duration_minutes,
         vss, vsd_personal, vsd_indiretto,
         telefonate, app_fissati, nncf, nncf_prompt_answered,
         notes, extra, created_at, updated_at)
       VALUES(,,,,,,,,,,,,,,,,,,now(),now())
       ON CONFLICT (id) DO NOTHING,
      [
        appointment.id,
        companyId,
        user.newId,
        clientInfo.clientId,
        appointment.client || '',
        String(appointment.type || 'manuale').toLowerCase(),
        toIso(appointment.start),
        deriveEnd(appointment.start, appointment.end, appointment.durationMinutes),
        Number(appointment.durationMinutes) || 0,
        Number(appointment.vss) || 0,
        Number(appointment.vsdPersonal || appointment.vsd_personal) || 0,
        Number(appointment.vsdIndiretto || appointment.vsd_indiretto) || 0,
        Number(appointment.telefonate) || 0,
        Number(appointment.appFissati || appointment.app_fissati) || 0,
        Boolean(appointment.nncf),
        Boolean(appointment.nncfPromptAnswered || appointment.nncf_prompt_answered),
        appointment.notes || null,
        {}
      ]
    );
    stats.imported += 1;
  }
  return stats;
}

async function importSales(companyId, salesData, clientMap, userMap, dryRun) {
  const stats = { total: 0, imported: 0, skipped: 0 };
  if (!salesData?.sales) return stats;
  for (const sale of salesData.sales) {
    stats.total += 1;
    const consultant = sale.consultantId ? userMap.get(sale.consultantId) : null;
    if (!consultant) {
      stats.skipped += 1;
      console.warn([sales] Skipping  - unknown user );
      continue;
    }
    let clientInfo = null;
    if (sale.clientId) {
      clientInfo = clientMap.get(sale.clientId);
    }
    if (!clientInfo && sale.clientName) {
      clientInfo = clientMap.get(normaliseName(sale.clientName));
    }
    if (!clientInfo) {
      stats.skipped += 1;
      console.warn([sales] Skipping  - no matching client '');
      continue;
    }
    let schedule = [];
    if (Array.isArray(sale.schedule)) {
      schedule = sale.schedule.map((item) => ({
        dueDate: toIso(item.dueDate || item.date) || null,
        amount: Number(item.amount) || 0,
        note: item.note || null
      }));
    }
    if (dryRun) {
      stats.imported += 1;
      continue;
    }
    await db.query(
      INSERT INTO bp_sales(
         id, company_id, consultant_id, client_id, appointment_id,
         client_name, sale_date, services, vss_total, schedule, metadata,
         created_at, updated_at)
       VALUES(,,,,,,,,,,,now(),now())
       ON CONFLICT (id) DO NOTHING,
      [
        sale.id,
        companyId,
        consultant.newId,
        clientInfo.clientId,
        sale.appointmentId || null,
        sale.clientName || null,
        toIso(sale.date) || new Date().toISOString(),
        sale.services || null,
        Number(sale.vssTotal) || 0,
        schedule,
        {}
      ]
    );
    stats.imported += 1;
  }
  return stats;
}

async function importPeriods(companyId, periodsData, userMap, dryRun) {
  const stats = { total: 0, imported: 0, skipped: 0 };
  if (!periodsData?.periods) return stats;
  for (const period of periodsData.periods) {
    stats.total += 1;
    const user = userMap.get(period.userId);
    if (!user) {
      stats.skipped += 1;
      continue;
    }
    if (dryRun) {
      stats.imported += 1;
      continue;
    }
    await db.query(
      INSERT INTO bp_periods(
         id, company_id, user_id, period_type, mode, start_date, end_date,
         indicators_prev, indicators_cons, totals, created_at, updated_at)
       VALUES(,,,,,,,,,,now(),now())
       ON CONFLICT (id) DO NOTHING,
      [
        period.id,
        companyId,
        user.newId,
        String(period.type || 'mensile').toLowerCase(),
        String(period.mode || 'consuntivo').toLowerCase(),
        (period.startDate || '').slice(0, 10),
        (period.endDate || '').slice(0, 10),
        period.indicatorsPrev || {},
        period.indicatorsCons || {},
        period.totals || {}
      ]
    );
    stats.imported += 1;
  }
  return stats;
}

async function importSettings(companyId, settingsData, recipientsData, dryRun) {
  if (!settingsData && !recipientsData) return;
  if (dryRun) return;
  if (settingsData) {
    await db.query(
      INSERT INTO bp_settings(company_id, indicators, weights, commissions, config, updated_at)
       VALUES(,,,,,now())
       ON CONFLICT (company_id) DO UPDATE SET
         indicators = EXCLUDED.indicators,
         weights = EXCLUDED.weights,
         commissions = EXCLUDED.commissions,
         config = EXCLUDED.config,
         updated_at = now(),
      [
        companyId,
        Array.isArray(settingsData.indicators) ? settingsData.indicators : (settingsData.indicators || ['VSS','VSDPersonale','VSDIndiretto','GI']),
        settingsData.weights || {},
        settingsData.commissions || {},
        settingsData.config || {}
      ]
    );
  }
  if (recipientsData) {
    await db.query(
      INSERT INTO bp_report_recipients(company_id, recipients_to, recipients_cc, recipients_bcc, updated_at)
       VALUES(,,,,now())
       ON CONFLICT (company_id) DO UPDATE SET
         recipients_to = EXCLUDED.recipients_to,
         recipients_cc = EXCLUDED.recipients_cc,
         recipients_bcc = EXCLUDED.recipients_bcc,
         updated_at = now(),
      [
        companyId,
        recipientsData.recipients?.to || [],
        recipientsData.recipients?.cc || [],
        recipientsData.recipients?.bcc || []
      ]
    );
  }
}

async function truncateTables(companyId) {
  await db.query('DELETE FROM bp_sales WHERE company_id = ', [companyId]);
  await db.query('DELETE FROM bp_appointments WHERE company_id = ', [companyId]);
  await db.query('DELETE FROM bp_periods WHERE company_id = ', [companyId]);
  await db.query('DELETE FROM bp_clients WHERE company_id = ', [companyId]);
  await db.query('DELETE FROM bp_consultants WHERE company_id = ', [companyId]);
}

async function main() {
  const options = parseArgs();
  console.log(Import BPApp data from  into company );

  const usersData = await readJson(path.join(options.dataDir, 'users.json'), { users: [] });
  const clientsData = await readJson(path.join(options.dataDir, 'clients.json'), { clients: [] });
  const appointmentsData = await readJson(path.join(options.dataDir, 'appointments.json'), { appointments: [] });
  const salesData = await readJson(path.join(options.dataDir, 'gi.json'), { sales: [] });
  const periodsData = await readJson(path.join(options.dataDir, 'periods.json'), { periods: [] });
  const settingsData = await readJson(path.join(options.dataDir, 'settings.json'), null);
  const recipientsData = await readJson(path.join(options.dataDir, 'report_recipients.json'), null);

  await withCompanyContext(options.company, async () => {
    if (options.truncate && !options.dryRun) {
      console.log('Truncating existing BP data for company', options.company);
      await truncateTables(options.company);
    }

    const userMap = await buildUserMap(options.company, usersData);
    const customerMap = await buildCustomerMap(options.company);

    if (!userMap.size) {
      console.warn('No BP users matched existing MagSuite users. Nothing to import.');
    }
    if (!customerMap.size) {
      console.warn('No customers found for company. Client import will be skipped.');
    }

    for (const mapping of userMap.values()) {
      await ensureConsultant(options.company, mapping, options.dryRun);
    }

    const { stats: clientStats, mapping: clientMapping } = await importClients(options.company, clientsData, customerMap, userMap, options.dryRun);
    console.log('Clients:', clientStats);

    const appointmentStats = await importAppointments(options.company, appointmentsData, clientMapping, userMap, options.dryRun);
    console.log('Appointments:', appointmentStats);

    const salesStats = await importSales(options.company, salesData, clientMapping, userMap, options.dryRun);
    console.log('Sales:', salesStats);

    const periodStats = await importPeriods(options.company, periodsData, userMap, options.dryRun);
    console.log('Periods:', periodStats);

    await importSettings(options.company, settingsData, recipientsData, options.dryRun);
    console.log('Settings: done');
  });

  if (!options.dryRun) {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS bp_user_period_totals');
  }

  console.log('Import completed');
}

main().catch((error) => {
  console.error('Import failed', error);
  process.exit(1);
});


