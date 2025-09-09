const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../db/audit.log');
fs.mkdirSync(path.dirname(logPath), { recursive: true });

function logAction(userId, action, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    ...details,
  };
  fs.appendFile(logPath, JSON.stringify(entry) + '\n', () => {});
}

module.exports = { logAction };
