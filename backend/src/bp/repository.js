"use strict";

const db = require("../db");

async function withTransaction(work){
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_){}
    throw err;
  } finally {
    client.release();
  }
}

function query(text, params){
  return db.query(text, params);
}

module.exports = {
  query,
  withTransaction
};