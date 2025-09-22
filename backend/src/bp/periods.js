"use strict";

const { randomUUID } = require("crypto");
const { query } = require("./repository");
const { PERIOD_TYPES } = require("./constants");
const { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfSemester, endOfSemester, startOfYear, endOfYear } = require("./time");

function generateId(){ return randomUUID().replace(/-/g, ""); }
function ensureType(value){
  const t = String(value || "mensile").toLowerCase();
  if(PERIOD_TYPES.includes(t)) return t;
  return "mensile";
}

function effectivePeriodType(value){
  const t = String(value || "mensile").toLowerCase();
  return (t === "ytd" || t === "ltm") ? "mensile" : t;
}

function toDate(val){ const d = val instanceof Date ? new Date(val.getTime()) : new Date(val); return Number.isNaN(d.getTime()) ? null : d; }
function normalizeIndicators(obj){
  if(!obj || typeof obj !== "object") return {};
  const out = {};
  for(const [key, value] of Object.entries(obj)){
    if(value == null || value === "") continue;
    const num = Number(value);
    out[key] = Number.isFinite(num) ? num : value;
  }
  return out;
}

function inferBounds(type, startHint){
  const ref = toDate(startHint) || new Date();
  switch(type){
    case "settimanale": return { start: startOfWeek(ref), end: endOfWeek(ref) };
    case "mensile": return { start: startOfMonth(ref), end: endOfMonth(ref) };
    case "trimestrale": return { start: startOfQuarter(ref), end: endOfQuarter(ref) };
    case "semestrale": return { start: startOfSemester(ref), end: endOfSemester(ref) };
    case "annuale": return { start: startOfYear(ref), end: endOfYear(ref) };
    case "ytd": return { start: startOfYear(ref), end: endOfMonth(ref) };
    case "ltm": {
      const end = endOfMonth(ref);
      const start = new Date(end); start.setMonth(start.getMonth() - 11, 1); start.setHours(0,0,0,0);
      return { start, end };
    }
    default: {
      const start = startOfMonth(ref);
      return { start, end: endOfMonth(start) };
    }
  }
}

async function listPeriods({ companyId, filters = {} }){
  const clauses = ["company_id = $1"]; const params = [companyId];
  if(filters.userId){ params.push(filters.userId); clauses.push("user_id = $" + params.length); }
  if(filters.type){
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    params.push(types);
    clauses.push("period_type = ANY($" + params.length + ")");
  }
  if(filters.from){ params.push(filters.from); clauses.push("start_date >= $" + params.length); }
  if(filters.to){ params.push(filters.to); clauses.push("end_date <= $" + params.length); }
  const { rows } = await query(
    `SELECT id, company_id, user_id, period_type, mode, start_date, end_date,
            indicators_prev, indicators_cons, totals, created_at, updated_at
       FROM bp_periods
      WHERE ${clauses.join(" AND ")}
      ORDER BY start_date DESC
      LIMIT ${Number(filters.limit || 200)} OFFSET ${Number(filters.offset || 0)}`,
    params
  );
  return rows;
}

async function getPeriod(companyId, id){
  const { rows } = await query(
    `SELECT * FROM bp_periods WHERE company_id = $1 AND id = $2`,
    [companyId, id]
  );
  return rows[0] || null;
}

async function savePeriod(companyId, requester, payload){
  const isUpdate = !!payload.id;
  const id = payload.id || generateId();
  const existing = isUpdate ? await getPeriod(companyId, id) : null;
  if(isUpdate && !existing) throw new Error("Periodo non trovato");
  if(isUpdate && existing.user_id !== requester.userId && !requester.canEditAll){
    throw new Error("Non autorizzato");
  }

  const type = ensureType(payload.period_type || payload.type);
  const from = toDate(payload.start_date || payload.startDate);
  const to = toDate(payload.end_date || payload.endDate);
  let start = from;
  let end = to;
  if(!start || !end){
    const bounds = inferBounds(type, start || end || new Date());
    start = start || bounds.start;
    end = end || bounds.end;
  }

  const row = {
    id,
    company_id: companyId,
    user_id: isUpdate ? existing.user_id : (payload.user_id || payload.userId || requester.userId),
    period_type: type,
    mode: payload.mode || existing?.mode || "consuntivo",
    start_date: start.toISOString().slice(0,10),
    end_date: end.toISOString().slice(0,10),
    indicators_prev: normalizeIndicators(payload.indicators_prev || payload.indicatorsPrev),
    indicators_cons: normalizeIndicators(payload.indicators_cons || payload.indicatorsCons),
    totals: payload.totals && typeof payload.totals === "object" ? payload.totals : {}
  };

  const params = [
    row.id,
    row.company_id,
    row.user_id,
    row.period_type,
    row.mode,
    row.start_date,
    row.end_date,
    row.indicators_prev,
    row.indicators_cons,
    row.totals
  ];

  await query(
    `INSERT INTO bp_periods(
       id, company_id, user_id, period_type, mode, start_date, end_date,
       indicators_prev, indicators_cons, totals, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
     ON CONFLICT (id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       period_type = EXCLUDED.period_type,
       mode = EXCLUDED.mode,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       indicators_prev = EXCLUDED.indicators_prev,
       indicators_cons = EXCLUDED.indicators_cons,
       totals = EXCLUDED.totals,
       updated_at = now()`,
    params
  );

  return getPeriod(companyId, id);
}

async function deletePeriod(companyId, requester, id){
  const existing = await getPeriod(companyId, id);
  if(!existing) return;
  if(existing.user_id !== requester.userId && !requester.canEditAll){
    throw new Error("Non autorizzato");
  }
  await query("DELETE FROM bp_periods WHERE company_id = $1 AND id = $2", [companyId, id]);
}

async function aggregateTotals(companyId, { userIds, periodType, mode = "consuntivo", from, to }){
  const clauses = ["company_id = $1", "mode = $2"]; const params = [companyId, mode];
  if(periodType){ params.push(periodType); clauses.push("period_type = $" + params.length); }
  if(userIds && userIds.length){ params.push(userIds); clauses.push("user_id = ANY($" + params.length + ")"); }
  if(from){ params.push(from); clauses.push("start_date >= $" + params.length); }
  if(to){ params.push(to); clauses.push("end_date <= $" + params.length); }

  const { rows } = await query(
    `SELECT user_id, indicators_prev, indicators_cons, totals
       FROM bp_periods
      WHERE ${clauses.join(" AND ")}`,
    params
  );

  const acc = new Map();
  for(const row of rows){
    const key = String(row.user_id);
    if(!acc.has(key)) acc.set(key, { userId: row.user_id, prev: {}, cons: {}, totals: {} });
    const target = acc.get(key);
    for(const [k,v] of Object.entries(row.indicators_prev || {})){
      const num = Number(v); target.prev[k] = (target.prev[k] || 0) + (Number.isFinite(num) ? num : 0);
    }
    for(const [k,v] of Object.entries(row.indicators_cons || {})){
      const num = Number(v); target.cons[k] = (target.cons[k] || 0) + (Number.isFinite(num) ? num : 0);
    }
    for(const [k,v] of Object.entries(row.totals || {})){
      const num = Number(v); target.totals[k] = (target.totals[k] || 0) + (Number.isFinite(num) ? num : 0);
    }
  }
  return Array.from(acc.values());
}

module.exports = {
  listPeriods,
  getPeriod,
  savePeriod,
  deletePeriod,
  aggregateTotals,
  effectivePeriodType
};

