"use strict";

const { query } = require("./repository");
const { COMMISSION_GRADES, CONSULTANT_ROLES } = require("./constants");

function normalizeGrade(grade){
  const val = String(grade || "junior").toLowerCase();
  return COMMISSION_GRADES.includes(val) ? val : "junior";
}

function normalizeRole(role){
  const val = String(role || "consultant").toLowerCase();
  return CONSULTANT_ROLES.includes(val) ? val : "consultant";
}

async function syncConsultant(companyId, userId, payload = {}){
  await query(
    `INSERT INTO bp_consultants(company_id, user_id, grade, bp_role, default_view, preferences, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,$6,now(),now())
     ON CONFLICT(company_id, user_id) DO UPDATE SET
       grade = EXCLUDED.grade,
       bp_role = EXCLUDED.bp_role,
       default_view = EXCLUDED.default_view,
       preferences = EXCLUDED.preferences,
       updated_at = now()` ,
    [
      companyId,
      userId,
      normalizeGrade(payload.grade),
      normalizeRole(payload.bp_role || payload.role),
      payload.default_view || payload.defaultView || "dashboard",
      payload.preferences || {}
    ]
  );
  return loadConsultant(companyId, userId);
}

async function loadConsultant(companyId, userId){
  const { rows } = await query(
    `SELECT company_id, user_id, grade, bp_role, default_view, preferences
       FROM bp_consultants
      WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  return rows[0] || {
    company_id: companyId,
    user_id: userId,
    grade: "junior",
    bp_role: "consultant",
    default_view: "dashboard",
    preferences: {}
  };
}

async function listConsultants(companyId){
  const { rows } = await query(
    `SELECT company_id, user_id, grade, bp_role, default_view, preferences
       FROM bp_consultants WHERE company_id = $1`,
    [companyId]
  );
  return rows;
}

module.exports = {
  syncConsultant,
  loadConsultant,
  listConsultants
};