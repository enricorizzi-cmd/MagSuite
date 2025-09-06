const bcrypt = require('bcryptjs');

const users = [];
let idSeq = 1;

async function createUser({ email, password, role = 'worker', warehouse_id }) {
  if (users.find((u) => u.email === email)) {
    throw new Error('User exists');
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = { id: idSeq++, email, password_hash, role, warehouse_id };
  users.push(user);
  return user;
}

async function authenticate({ email, password }) {
  const user = users.find((u) => u.email === email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

module.exports = { createUser, authenticate };
