"use strict";

const { query } = require("./repository");
let webPush;
try {
  webPush = require("web-push");
} catch {
  webPush = null;
}

function isConfigured(){
  return !!(webPush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure(){
  if(!isConfigured()) return;
  try {
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
    webPush.setVapidDetails(subject, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("[bp push] VAPID configuration failed", err.message);
  }
}

async function listSubscriptions(companyId, userId){
  const params = [companyId];
  let where = "company_id = $1";
  if(userId){ params.push(userId); where += " AND user_id = $2"; }
  const { rows } = await query(
    `SELECT id, company_id, user_id, endpoint, p256dh, auth, created_at, last_seen
       FROM bp_push_subscriptions
      WHERE ${where}`,
    params
  );
  return rows;
}

async function saveSubscription(companyId, userId, subscription){
  if(!subscription || !subscription.endpoint || !subscription.keys){
    throw new Error("Subscription non valida");
  }
  await query(
    `INSERT INTO bp_push_subscriptions(company_id, user_id, endpoint, p256dh, auth, created_at, last_seen)
     VALUES($1,$2,$3,$4,$5,now(),now())
     ON CONFLICT(endpoint) DO UPDATE SET
       company_id = EXCLUDED.company_id,
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       last_seen = EXCLUDED.last_seen` ,
    [companyId, userId || null, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
}

async function deleteSubscription(companyId, userId, endpoint){
  const params = [endpoint];
  let where = "endpoint = $1";
  if(companyId){ params.push(companyId); where += " AND company_id = $" + params.length; }
  if(userId){ params.push(userId); where += " AND user_id = $" + params.length; }
  await query(`DELETE FROM bp_push_subscriptions WHERE ${where}`, params);
}

async function sendNotification(subscription, payload){
  if(!isConfigured()) return { ok: false, error: "not_configured" };
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload || {}));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.statusCode || err.message };
  }
}

module.exports = {
  configure,
  isConfigured,
  listSubscriptions,
  saveSubscription,
  deleteSubscription,
  sendNotification
};