"use strict";

const { randomUUID } = require("crypto");
const { query } = require("./repository");
const { CLIENT_STATUSES } = require("./constants");

function generateId() {
  return randomUUID().replace(/-/g, "");
}

function normaliseStatus(status) {
  const val = String(status || "").trim().toLowerCase();
  if (!val) return "lead";
  const hit = CLIENT_STATUSES.find((s) => s.toLowerCase() === val);
  return hit || val;
}

function toCustomerId(value) {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

async function getCustomer(companyId, customerId) {
  const id = toCustomerId(customerId);
  if (!id) return null;
  const { rows } = await query(
    {
      text: `SELECT id, code, name, email, phone, agent
               FROM customers
              WHERE id = $1 AND company_id = $2`,
      values: [id, companyId]
    }
  );
  return rows[0] || null;
}

async function getExistingLink(companyId, customerId) {
  const id = toCustomerId(customerId);
  if (!id) return null;
  const { rows } = await query(
    {
      text: `SELECT id, consultant_id, status, metadata, last_appointment_at
               FROM bp_clients
              WHERE company_id = $1 AND customer_id = $2`,
      values: [companyId, id]
    }
  );
  return rows[0] || null;
}

async function getClient(companyId, id) {
  const asNumber = toCustomerId(id);
  const params = [companyId, String(id)];
  let condition = "bc.company_id = $1 AND bc.id = $2";
  if (asNumber) {
    params.push(asNumber);
    condition = "bc.company_id = $1 AND (bc.id = $2 OR bc.customer_id = $3)";
  }
  const { rows } = await query(
    {
      text: `SELECT bc.id,
                    bc.company_id,
                    bc.consultant_id,
                    bc.customer_id,
                    bc.status,
                    bc.last_appointment_at,
                    bc.metadata,
                    bc.created_at,
                    bc.updated_at,
                    c.name,
                    c.code AS customer_code,
                    c.email AS customer_email,
                    c.phone AS customer_phone,
                    c.agent AS customer_agent
               FROM bp_clients AS bc
               JOIN customers AS c
                 ON c.id = bc.customer_id
                AND c.company_id = bc.company_id
              WHERE ${condition}
              LIMIT 1`,
      values: params
    }
  );
  return rows[0] || null;
}

async function listClients({ companyId, consultantId, search, limit = 100, offset = 0 }) {
  const clauses = ["bc.company_id = $1"];
  const params = [companyId];
  if (consultantId) {
    params.push(consultantId);
    clauses.push("(bc.consultant_id = $" + params.length + " OR bc.consultant_id IS NULL)");
  }
  if (search) {
    const value = `%${String(search).trim().toLowerCase()}%`;
    params.push(value);
    clauses.push("(lower(c.name) LIKE $" + params.length + " OR lower(c.code) LIKE $" + params.length + ")");
  }
  const sql = `SELECT bc.id,
                      bc.company_id,
                      bc.consultant_id,
                      bc.customer_id,
                      bc.status,
                      bc.last_appointment_at,
                      bc.metadata,
                      bc.created_at,
                      bc.updated_at,
                      c.name,
                      c.code AS customer_code,
                      c.email AS customer_email,
                      c.phone AS customer_phone
                 FROM bp_clients AS bc
                 JOIN customers AS c
                   ON c.id = bc.customer_id
                  AND c.company_id = bc.company_id
                WHERE ${clauses.join(" AND ")}
                ORDER BY COALESCE(bc.last_appointment_at, bc.updated_at) DESC
                LIMIT ${Number(limit)}
               OFFSET ${Number(offset)}`;
  const { rows } = await query({ text: sql, values: params });
  return rows;
}

async function linkCustomer(companyId, { customerId, consultantId = null, status, metadata }) {
  const customer = await getCustomer(companyId, customerId);
  if (!customer) {
    throw new Error("Cliente non trovato nelle anagrafiche");
  }
  const existing = await getExistingLink(companyId, customer.id);
  const id = existing?.id || generateId();
  const normalizedStatus = normaliseStatus(status);
  await query(
    {
      text: `INSERT INTO bp_clients(id, company_id, consultant_id, customer_id, name, status, metadata, last_appointment_at, created_at, updated_at)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,now(),now())
             ON CONFLICT (company_id, customer_id) DO UPDATE SET
               consultant_id = EXCLUDED.consultant_id,
               name = EXCLUDED.name,
               status = EXCLUDED.status,
               metadata = COALESCE(bp_clients.metadata, '{}'::jsonb) || EXCLUDED.metadata,
               last_appointment_at = COALESCE(EXCLUDED.last_appointment_at, bp_clients.last_appointment_at),
               updated_at = now()`,
      values: [
        id,
        companyId,
        consultantId || null,
        customer.id,
        customer.name,
        normalizedStatus,
        metadata && typeof metadata === "object" ? metadata : {},
        existing?.last_appointment_at || null
      ]
    }
  );
  return getClient(companyId, id);
}

async function saveClient(companyId, payload) {
  const customerId =
    toCustomerId(payload?.customer_id) ??
    toCustomerId(payload?.customerId) ??
    toCustomerId(payload?.id);
  if (!customerId) {
    throw new Error("Cliente obbligatorio (seleziona una scheda anagrafiche)");
  }
  return linkCustomer(companyId, {
    customerId,
    consultantId: payload?.consultant_id ?? payload?.consultantId ?? null,
    status: payload?.status,
    metadata: payload?.metadata
  });
}

async function deleteClient(companyId, id) {
  const numeric = toCustomerId(id);
  const params = [companyId, String(id)];
  let where = "company_id = $1 AND id = $2";
  if (numeric) {
    params.push(numeric);
    where = "company_id = $1 AND (id = $2 OR customer_id = $3)";
  }
  await query({ text: `DELETE FROM bp_clients WHERE ${where}`, values: params });
}

async function touchLastAppointment(companyId, clientId, when) {
  const numeric = toCustomerId(clientId);
  const params = [when, companyId, String(clientId)];
  let where = "company_id = $2 AND id = $3";
  if (numeric) {
    params.push(numeric);
    where = "company_id = $2 AND (id = $3 OR customer_id = $4)";
  }
  await query({
    text: `UPDATE bp_clients
             SET last_appointment_at = $1,
                 updated_at = GREATEST(updated_at, $1)
           WHERE ${where}`,
    values: params
  });
}

async function findOrCreateClientByName(companyId, consultantId, name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Nome cliente obbligatorio");
  const lookup = clean.toLowerCase();
  const { rows } = await query({
    text: `SELECT id, name
             FROM customers
            WHERE company_id = $1 AND lower(name) = $2
            ORDER BY updated_at DESC
            LIMIT 1`,
    values: [companyId, lookup]
  });
  if (!rows[0]) {
    throw new Error("Cliente non trovato: crea la scheda in Anagrafiche > Clienti");
  }
  return linkCustomer(companyId, {
    customerId: rows[0].id,
    consultantId,
    status: "lead"
  });
}

async function getClientByCustomer(companyId, customerId) {
  const existing = await getExistingLink(companyId, customerId);
  if (!existing) return null;
  return getClient(companyId, existing.id);
}

async function searchCustomers(companyId, term, limit = 10) {
  const clean = String(term || "").trim();
  if (!clean) return [];
  const value = `%${clean.toLowerCase()}%`;
  const capped = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const { rows } = await query({
    text: `SELECT id, code, name, email, phone
             FROM customers
            WHERE company_id = $1
              AND (lower(name) LIKE $2 OR lower(code) LIKE $2)
            ORDER BY updated_at DESC
            LIMIT $3`,
    values: [companyId, value, capped]
  });
  return rows;
}

module.exports = {
  listClients,
  getClient,
  getClientByCustomer,
  saveClient,
  deleteClient,
  touchLastAppointment,
  findOrCreateClientByName,
  searchCustomers,
  linkCustomer
};
