"use strict";

const APPOINTMENT_TYPES = [
  "manuale",
  "telefonata",
  "incontro",
  "vendita",
  "mezza",
  "giornata",
  "formazione",
  "mbs",
  "sottoprodotti"
];

const CLIENT_STATUSES = [
  "lead",
  "lead non chiuso",
  "potenziale",
  "attivo",
  "on hold",
  "churn"
];

const PERIOD_TYPES = [
  "settimanale",
  "mensile",
  "trimestrale",
  "semestrale",
  "annuale",
  "ytd",
  "ltm"
];

const COMMISSION_GRADES = ["junior", "senior"];
const CONSULTANT_ROLES = ["consultant", "admin", "manager"];

module.exports = {
  APPOINTMENT_TYPES,
  CLIENT_STATUSES,
  PERIOD_TYPES,
  COMMISSION_GRADES,
  CONSULTANT_ROLES
};