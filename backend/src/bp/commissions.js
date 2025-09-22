"use strict";

const { query } = require("./repository");
const { effectivePeriodType } = require("./periods");

function normalizeMode(mode) {
  return mode === 'previsionale' ? 'previsionale' : 'consuntivo';
}

function pickBag(row, mode) {
  return mode === 'previsionale' ? (row.indicators_prev || {}) : (row.indicators_cons || {});
}

function addValue(target, key, value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return;
  target[key] = (target[key] || 0) + num;
}

async function summary(companyId, { mode = 'consuntivo', from, to, type }) {
  if (!from || !to) throw new Error('missing params');
  const normalizedMode = normalizeMode(mode);

  const params = [companyId, from, to];
  let filterTypeSql = '';
  if (type) {
    const eff = effectivePeriodType(type);
    params.push(eff);
    filterTypeSql = ` AND period_type = $${params.length}`;
  }

  const sql = `
    SELECT user_id, indicators_prev, indicators_cons
      FROM bp_periods
     WHERE company_id = $1
       AND end_date >= $2
       AND start_date <= $3
       ${filterTypeSql}
  `;
  const { rows } = await query(sql, params);

  const usersRes = await query(
    'SELECT id, COALESCE(name, email) AS label FROM users WHERE company_id = $1',
    [companyId]
  );
  const userMap = new Map(usersRes.rows.map(row => [String(row.id), row.label || String(row.id)]));

  const acc = new Map();
  for (const row of rows) {
    const key = String(row.user_id);
    if (!acc.has(key)) {
      acc.set(key, { id: row.user_id, name: userMap.get(key) || String(row.user_id), provvGi: 0, provvVsd: 0, provvTot: 0 });
    }
    const bucket = pickBag(row, normalizedMode);
    const target = acc.get(key);
    addValue(target, 'provvGi', bucket.ProvvGI);
    addValue(target, 'provvVsd', bucket.ProvvVSD);
    if (bucket.TotProvvigioni != null) {
      addValue(target, 'provvTot', bucket.TotProvvigioni);
    } else {
      const gi = Number(bucket.ProvvGI || 0);
      const vsd = Number(bucket.ProvvVSD || 0);
      addValue(target, 'provvTot', gi + vsd);
    }
  }

  return Array.from(acc.values());
}

module.exports = {
  summary
};