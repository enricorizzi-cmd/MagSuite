"use strict";

const { aggregateTotals } = require("./periods");
const clients = require("./clients");
const appointments = require("./appointments");

async function computeKpis(companyId, requester, { currentFrom, currentTo }) {
  const totals = await aggregateTotals(companyId, {
    userIds: requester.canViewAll ? undefined : [requester.userId],
    periodType: 'mensile',
    mode: 'consuntivo',
    from: currentFrom,
    to: currentTo
  });
  const sum = totals.reduce((acc, row) => {
    for (const [key, value] of Object.entries(row.totals || {})) {
      acc[key] = (acc[key] || 0) + (Number(value) || 0);
    }
    return acc;
  }, {});
  return sum;
}

async function computeAgenda(companyId, requester) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const list = await appointments.listAppointments({
    companyId,
    requester,
    filters: {
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 25
    }
  });
  return list;
}

async function computeClients(companyId, requester) {
  return clients.listClients({
    companyId,
    consultantId: requester.canViewAll ? undefined : requester.userId,
    limit: 10
  });
}

module.exports = {
  computeKpis,
  computeAgenda,
  computeClients
};