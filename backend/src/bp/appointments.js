"use strict";

const { randomUUID } = require("crypto");
const { query, withTransaction } = require("./repository");
const clients = require("./clients");
const { APPOINTMENT_TYPES } = require("./constants");

function generateId() { return randomUUID().replace(/-/g, ""); }
function parseDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (!value) return new Date(NaN);
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  return new Date(NaN);
}

function defaultMinutes(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("mezza")) return 240;
  if (t.includes("giorn")) return 570;
  if (t.includes("formaz")) return 570;
  if (t.includes("mbs")) return 570;
  if (t.includes("sottoprod")) return 240;
  if (t.includes("vend")) return 90;
  if (t.includes("telefon")) return 30;
  return 90;
}

function toNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function toInteger(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }

async function resolveClient(companyId, requester, payload) {
  const customerIdInput = payload.customer_id ?? payload.customerId;
  const clientIdInput = payload.client_id ?? payload.clientId;
  const clientName = payload.client || payload.client_name;
  const consultantId = requester?.userId;

  if (customerIdInput) {
    return clients.linkCustomer(companyId, {
      customerId: customerIdInput,
      consultantId,
      status: payload.client_status ?? payload.status,
      metadata: payload.client_metadata ?? payload.metadata
    });
  }
  if (clientIdInput) {
    const row = await clients.getClient(companyId, clientIdInput);
    if (!row) throw new Error("Cliente non trovato");
    return row;
  }
  if (clientName) {
    return clients.findOrCreateClientByName(companyId, consultantId, clientName);
  }
  throw new Error("Cliente obbligatorio");
}

async function listAppointments({ companyId, requester, filters = {} }) {
  const clauses = ["a.company_id = $1"];
  const params = [companyId];
  if (!filters.global) {
    if (filters.userId && requester.canViewAll) {
      params.push(filters.userId);
      clauses.push("a.user_id = $" + params.length);
    } else {
      params.push(requester.userId);
      clauses.push("a.user_id = $" + params.length);
    }
  } else if (filters.userId) {
    params.push(filters.userId);
    clauses.push("a.user_id = $" + params.length);
  }
  if (filters.clientId) {
    const strId = String(filters.clientId);
    const numeric = Number(filters.clientId);
    params.push(strId);
    let condition = "a.client_id = $" + params.length;
    if (Number.isInteger(numeric)) {
      params.push(numeric);
      condition = "(a.client_id = $" + (params.length - 1) + " OR link.customer_id = $" + params.length + ")";
    }
    clauses.push(condition);
  }
  if (filters.clientCustomerId) {
    params.push(filters.clientCustomerId);
    clauses.push("link.customer_id = $" + params.length);
  }
  if (filters.from) {
    params.push(filters.from);
    clauses.push("a.start_at >= $" + params.length);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push("a.start_at <= $" + params.length);
  }
  const { rows } = await query({
    text: `SELECT a.id, a.company_id, a.user_id, a.client_id, link.customer_id,
                  a.client_name, a.appointment_type, a.start_at, a.end_at, a.duration_minutes,
                  a.vss, a.vsd_personal, a.vsd_indiretto, a.telefonate, a.app_fissati,
                  a.nncf, a.nncf_prompt_answered, a.notes, a.extra, a.created_at, a.updated_at
             FROM bp_appointments AS a
             LEFT JOIN bp_clients AS link
               ON link.company_id = a.company_id
              AND link.id = a.client_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY a.start_at DESC
            LIMIT ${Number(filters.limit || 200)} OFFSET ${Number(filters.offset || 0)}`,
    values: params
  });
  return rows;
}

async function getAppointment(companyId, id) {
  const { rows } = await query({
    text: `SELECT a.*, link.customer_id
             FROM bp_appointments AS a
             LEFT JOIN bp_clients AS link
               ON link.company_id = a.company_id
              AND link.id = a.client_id
            WHERE a.company_id = $1 AND a.id = $2`,
    values: [companyId, id]
  });
  return rows[0] || null;
}

async function getLastAppointment(companyId, userId) {
  const { rows } = await query({
    text: `SELECT *
             FROM bp_appointments
            WHERE company_id = $1 AND user_id = $2
            ORDER BY start_at DESC
            LIMIT 1`,
    values: [companyId, userId]
  });
  return rows[0] || null;
}

function ensureType(value) {
  const t = String(value || "manuale").toLowerCase();
  if (APPOINTMENT_TYPES.includes(t)) return t;
  return "manuale";
}

function deriveEnd(start, end, duration) {
  const startDate = parseDate(start);
  if (!startDate) return null;
  const endDate = parseDate(end);
  if (endDate && !Number.isNaN(endDate.getTime())) return endDate.toISOString();
  const minutes = Number(duration);
  const effective = Number.isFinite(minutes) && minutes > 0 ? minutes : 90;
  const computed = new Date(startDate.getTime() + effective * 60000);
  return computed.toISOString();
}

async function saveAppointment(companyId, requester, payload) {
  const isUpdate = Boolean(payload.id);
  const id = payload.id || generateId();
  const existing = isUpdate ? await getAppointment(companyId, id) : null;
  if (isUpdate && !existing) throw new Error("Appuntamento non trovato");
  if (isUpdate && existing.user_id !== requester.userId && !requester.canEditAll) {
    throw new Error("Non autorizzato");
  }

  const type = ensureType(payload.type || payload.appointment_type);
  const start = parseDate(payload.start || payload.start_at);
  if (Number.isNaN(start.getTime())) throw new Error("Data inizio non valida");

  let duration = toInteger(payload.durationMinutes || payload.duration_minutes);
  let endIso = null;
  if (payload.end || payload.end_at) {
    endIso = parseDate(payload.end || payload.end_at)?.toISOString() || null;
    if (endIso) {
      const endDate = new Date(endIso);
      duration = Math.max(1, Math.round((endDate.getTime() - start.getTime()) / 60000));
    }
  }
  if (!endIso) {
    if (!duration || duration <= 0) duration = defaultMinutes(type);
    endIso = deriveEnd(start.toISOString(), null, duration);
  }

  const clientRow = await resolveClient(companyId, requester, payload);

  if (!clientRow?.id) throw new Error("Cliente non valido");

  const now = new Date();
  const row = {
    id,
    company_id: companyId,
    user_id: isUpdate ? existing.user_id : requester.userId,
    client_id: clientRow.id,
    client_name: clientRow.name || payload.client || '',
    appointment_type: type,
    start_at: start.toISOString(),
    end_at: endIso,
    duration_minutes: duration,
    vss: toNumber(payload.vss),
    vsd_personal: toNumber(payload.vsdPersonal || payload.vsd_personal),
    vsd_indiretto: toNumber(payload.vsdIndiretto || payload.vsd_indiretto),
    telefonate: toInteger(payload.telefonate),
    app_fissati: toInteger(payload.appFissati || payload.app_fissati),
    nncf: Boolean(payload.nncf),
    nncf_prompt_answered: Boolean(payload.nncfPromptAnswered || payload.nncf_prompt_answered),
    notes: payload.notes || null,
    extra: payload.extra || payload.metadata || {},
    created_at: isUpdate ? existing.created_at : now,
    updated_at: now,
    customer_id: clientRow.customer_id
  };

  await withTransaction(async (client) => {
    if (isUpdate) {
      await client.query(
        `UPDATE bp_appointments SET
           client_id = $1,
           client_name = $2,
           appointment_type = $3,
           start_at = $4,
           end_at = $5,
           duration_minutes = $6,
           vss = $7,
           vsd_personal = $8,
           vsd_indiretto = $9,
           telefonate = $10,
           app_fissati = $11,
           nncf = $12,
           nncf_prompt_answered = $13,
           notes = $14,
           extra = $15,
           updated_at = $16
         WHERE company_id = $17 AND id = $18`,
        [
          row.client_id,
          row.client_name,
          row.appointment_type,
          row.start_at,
          row.end_at,
          row.duration_minutes,
          row.vss,
          row.vsd_personal,
          row.vsd_indiretto,
          row.telefonate,
          row.app_fissati,
          row.nncf,
          row.nncf_prompt_answered,
          row.notes,
          row.extra,
          row.updated_at,
          companyId,
          id
        ]
      );
    } else {
      await client.query(
        `INSERT INTO bp_appointments(
           id, company_id, user_id, client_id, client_name,
           appointment_type, start_at, end_at, duration_minutes,
           vss, vsd_personal, vsd_indiretto,
           telefonate, app_fissati, nncf, nncf_prompt_answered,
           notes, extra, created_at, updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)` ,
        [
          row.id,
          row.company_id,
          row.user_id,
          row.client_id,
          row.client_name,
          row.appointment_type,
          row.start_at,
          row.end_at,
          row.duration_minutes,
          row.vss,
          row.vsd_personal,
          row.vsd_indiretto,
          row.telefonate,
          row.app_fissati,
          row.nncf,
          row.nncf_prompt_answered,
          row.notes,
          row.extra,
          row.created_at,
          row.updated_at
        ]
      );
    }
    await client.query(
      `UPDATE bp_clients
          SET consultant_id = COALESCE(consultant_id, $1),
              last_appointment_at = GREATEST(COALESCE(last_appointment_at, $2), $2),
              updated_at = GREATEST(updated_at, $3)
        WHERE company_id = $4 AND (id = $5 OR customer_id = $6)` ,
      [row.user_id, row.start_at, now, companyId, row.client_id, row.customer_id]
    );
  });

  return getAppointment(companyId, id);
}

async function deleteAppointment(companyId, requester, id) {
  const existing = await getAppointment(companyId, id);
  if (!existing) return;
  if (existing.user_id !== requester.userId && !requester.canEditAll) {
    throw new Error("Non autorizzato");
  }
  await query({ text: "DELETE FROM bp_appointments WHERE company_id = $1 AND id = $2", values: [companyId, id] });
}

module.exports = {
  listAppointments,
  getAppointment,
  getLastAppointment,
  saveAppointment,
  deleteAppointment
};


