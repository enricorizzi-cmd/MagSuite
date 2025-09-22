"use strict";

const { randomUUID } = require("crypto");
const { query } = require("./repository");
const clients = require("./clients");

function generateId() { return randomUUID().replace(/-/g, ""); }
function toDate(val) { const d = val instanceof Date ? new Date(val.getTime()) : new Date(val); return Number.isNaN(d.getTime()) ? null : d; }
function normalizeSchedule(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(Boolean).map((item) => {
    const dueDate = toDate(item.dueDate || item.due_date || item.date);
    return {
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0,
      note: item.note || item.description || null
    };
  });
}

async function listSales({ companyId, filters = {} }) {
  const clauses = ["s.company_id = $1"];
  const params = [companyId];
  if (filters.consultantId) { params.push(filters.consultantId); clauses.push("s.consultant_id = $" + params.length); }
  if (filters.clientId) {
    const strId = String(filters.clientId);
    const numeric = Number(filters.clientId);
    params.push(strId);
    let condition = "s.client_id = $" + params.length;
    if (Number.isInteger(numeric)) {
      params.push(numeric);
      condition = "(s.client_id = $" + (params.length - 1) + " OR link.customer_id = $" + params.length + ")";
    }
    clauses.push(condition);
  }
  if (filters.customerId) {
    params.push(filters.customerId);
    clauses.push("link.customer_id = $" + params.length);
  }
  if (filters.from) { params.push(filters.from); clauses.push("s.sale_date >= $" + params.length); }
  if (filters.to) { params.push(filters.to); clauses.push("s.sale_date <= $" + params.length); }
  const { rows } = await query({
    text: `SELECT s.id, s.company_id, s.consultant_id, s.client_id, link.customer_id,
                  s.appointment_id, s.client_name, s.sale_date, s.services,
                  s.vss_total, s.schedule, s.metadata, s.created_at, s.updated_at
             FROM bp_sales AS s
             LEFT JOIN bp_clients AS link
               ON link.company_id = s.company_id
              AND link.id = s.client_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY s.sale_date DESC
            LIMIT ${Number(filters.limit || 200)} OFFSET ${Number(filters.offset || 0)}`,
    values: params
  });
  return rows;
}

async function getSale(companyId, id) {
  const { rows } = await query({
    text: `SELECT s.*, link.customer_id
             FROM bp_sales AS s
             LEFT JOIN bp_clients AS link
               ON link.company_id = s.company_id
              AND link.id = s.client_id
            WHERE s.company_id = $1 AND s.id = $2`,
    values: [companyId, id]
  });
  return rows[0] || null;
}

async function resolveClient(companyId, payload, consultantId) {
  const customerId = payload.customer_id ?? payload.customerId;
  const clientId = payload.client_id ?? payload.clientId;
  const clientName = payload.client_name ?? payload.clientName;
  if (customerId) {
    return clients.linkCustomer(companyId, { customerId, consultantId, status: payload.client_status, metadata: payload.client_metadata });
  }
  if (clientId) {
    return clients.getClient(companyId, clientId);
  }
  if (clientName) {
    return clients.findOrCreateClientByName(companyId, consultantId, clientName);
  }
  return null;
}

async function saveSale(companyId, requester, payload) {
  const isUpdate = Boolean(payload.id);
  const id = payload.id || generateId();
  const existing = isUpdate ? await getSale(companyId, id) : null;
  if (isUpdate && !existing) throw new Error("Vendita non trovata");
  if (isUpdate && existing.consultant_id && existing.consultant_id !== requester.userId && !requester.canEditAll) {
    throw new Error("Non autorizzato");
  }

  const consultantId = payload.consultant_id || payload.consultantId || existing?.consultant_id || requester.userId;
  const saleDate = toDate(payload.sale_date || payload.saleDate || new Date());
  if (!saleDate) throw new Error("Data vendita non valida");

  const clientRow = await resolveClient(companyId, payload, consultantId);
  if (!clientRow) {
    throw new Error('Cliente obbligatorio per registrare una vendita');
  }

  const row = {
    id,
    company_id: companyId,
    consultant_id: consultantId,
    client_id: clientRow?.id || payload.client_id || payload.clientId || existing?.client_id || null,
    customer_id: clientRow?.customer_id || existing?.customer_id || null,
    appointment_id: payload.appointment_id || payload.appointmentId || null,
    client_name: payload.client_name || payload.clientName || clientRow?.name || null,
    sale_date: saleDate.toISOString().slice(0, 10),
    services: payload.services || null,
    vss_total: Number.isFinite(Number(payload.vss_total || payload.vssTotal)) ? Number(payload.vss_total || payload.vssTotal) : 0,
    schedule: normalizeSchedule(payload.schedule),
    metadata: payload.metadata || {}
  };

  await query({
    text: `INSERT INTO bp_sales(
             id, company_id, consultant_id, client_id, appointment_id,
             client_name, sale_date, services, vss_total, schedule, metadata,
             created_at, updated_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now())
           ON CONFLICT (id) DO UPDATE SET
             consultant_id = EXCLUDED.consultant_id,
             client_id = EXCLUDED.client_id,
             appointment_id = EXCLUDED.appointment_id,
             client_name = EXCLUDED.client_name,
             sale_date = EXCLUDED.sale_date,
             services = EXCLUDED.services,
             vss_total = EXCLUDED.vss_total,
             schedule = EXCLUDED.schedule,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
    values: [
      row.id,
      row.company_id,
      row.consultant_id,
      row.client_id,
      row.appointment_id,
      row.client_name,
      row.sale_date,
      row.services,
      row.vss_total,
      row.schedule,
      row.metadata
    ]
  });

  return getSale(companyId, id);
}

async function deleteSale(companyId, requester, id) {
  const existing = await getSale(companyId, id);
  if (!existing) return;
  if (existing.consultant_id && existing.consultant_id !== requester.userId && !requester.canEditAll) {
    throw new Error("Non autorizzato");
  }
  await query({ text: "DELETE FROM bp_sales WHERE company_id = $1 AND id = $2", values: [companyId, id] });
}

module.exports = {
  listSales,
  getSale,
  saveSale,
  deleteSale
};

