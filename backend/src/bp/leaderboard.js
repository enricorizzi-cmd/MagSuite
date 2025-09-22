"use strict";

const { aggregateTotals } = require("./periods");
const { loadSettings } = require("./settings");

function computeScore(row, weights){
  const totals = row.totals || {};
  let score = 0;
  for(const [key, weight] of Object.entries(weights || {})){
    const value = Number(totals[key]) || 0;
    const w = Number(weight) || 0;
    score += value * w;
  }
  return score;
}

async function buildLeaderboard({ companyId, userIds, periodType, mode, from, to }){
  const [totals, settings] = await Promise.all([
    aggregateTotals(companyId, { userIds, periodType, mode, from, to }),
    loadSettings(companyId)
  ]);

  const weights = settings.weights || {};
  const enriched = totals.map((row) => ({
    userId: row.userId,
    prev: row.prev,
    cons: row.cons,
    totals: row.totals,
    score: computeScore(row, weights)
  }));
  enriched.sort((a,b) => b.score - a.score);
  return { settings, entries: enriched };
}

module.exports = {
  buildLeaderboard
};