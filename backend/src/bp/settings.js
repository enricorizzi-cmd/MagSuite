"use strict";

const { query } = require("./repository");
const { COMMISSION_GRADES } = require("./constants");

const DEFAULT_SETTINGS = {
  indicators: [
    "VSS",
    "VSDPersonale",
    "VSDIndiretto",
    "GI",
    "Telefonate",
    "AppFissati",
    "AppFatti",
    "CorsiLeadership",
    "iProfile",
    "MBS",
    "NNCF"
  ],
  weights: {},
  commissions: {
    gi: 0.15,
    vsdJunior: 0.2,
    vsdSenior: 0.25
  },
  config: {}
};

async function loadSettings(companyId){
  const { rows } = await query(
    `SELECT company_id, indicators, weights, commissions, config, updated_at
       FROM bp_settings WHERE company_id = $1`,
    [companyId]
  );
  if(rows[0]){
    const value = rows[0];
    return {
      companyId: value.company_id,
      indicators: value.indicators || DEFAULT_SETTINGS.indicators,
      weights: value.weights || DEFAULT_SETTINGS.weights,
      commissions: value.commissions || DEFAULT_SETTINGS.commissions,
      config: value.config || DEFAULT_SETTINGS.config,
      updatedAt: value.updated_at
    };
  }
  return {
    companyId,
    ...DEFAULT_SETTINGS,
    updatedAt: null
  };
}

async function saveSettings(companyId, payload){
  const indicators = Array.isArray(payload.indicators) && payload.indicators.length
    ? payload.indicators.map((s) => String(s))
    : DEFAULT_SETTINGS.indicators;
  const weights = payload.weights && typeof payload.weights === "object" ? payload.weights : {};
  const commissions = payload.commissions && typeof payload.commissions === "object" ? payload.commissions : DEFAULT_SETTINGS.commissions;
  const config = payload.config && typeof payload.config === "object" ? payload.config : {};

  await query(
    `INSERT INTO bp_settings(company_id, indicators, weights, commissions, config, updated_at)
     VALUES($1,$2,$3,$4,$5,now())
     ON CONFLICT (company_id) DO UPDATE SET
       indicators = EXCLUDED.indicators,
       weights = EXCLUDED.weights,
       commissions = EXCLUDED.commissions,
       config = EXCLUDED.config,
       updated_at = now()`,
    [companyId, indicators, weights, commissions, config]
  );
  return loadSettings(companyId);
}

async function loadReportRecipients(companyId){
  const { rows } = await query(
    `SELECT recipients_to, recipients_cc, recipients_bcc FROM bp_report_recipients WHERE company_id = $1`,
    [companyId]
  );
  if(rows[0]){
    return {
      to: rows[0].recipients_to || [],
      cc: rows[0].recipients_cc || [],
      bcc: rows[0].recipients_bcc || []
    };
  }
  return { to: [], cc: [], bcc: [] };
}

async function saveReportRecipients(companyId, payload){
  const to = Array.isArray(payload.to) ? payload.to.map(String) : [];
  const cc = Array.isArray(payload.cc) ? payload.cc.map(String) : [];
  const bcc = Array.isArray(payload.bcc) ? payload.bcc.map(String) : [];
  await query(
    `INSERT INTO bp_report_recipients(company_id, recipients_to, recipients_cc, recipients_bcc, updated_at)
     VALUES($1,$2,$3,$4,now())
     ON CONFLICT (company_id) DO UPDATE SET
       recipients_to = EXCLUDED.recipients_to,
       recipients_cc = EXCLUDED.recipients_cc,
       recipients_bcc = EXCLUDED.recipients_bcc,
       updated_at = EXCLUDED.updated_at`,
    [companyId, to, cc, bcc]
  );
  return loadReportRecipients(companyId);
}

function consultantCommissionRate(settings, grade){
  if(!settings || !settings.commissions) return 0;
  if(grade === "senior") return Number(settings.commissions.vsdSenior ?? settings.commissions.vsd_senior ?? 0);
  if(grade === "junior") return Number(settings.commissions.vsdJunior ?? settings.commissions.vsd_junior ?? 0);
  return Number(settings.commissions.vsdJunior ?? 0);
}

module.exports = {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadReportRecipients,
  saveReportRecipients,
  consultantCommissionRate,
  COMMISSION_GRADES
};