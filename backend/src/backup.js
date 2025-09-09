const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const logger = require('./logger');

async function runTenantBackups() {
  const { rows } = await db.query('SELECT id FROM companies');
  const date = new Date().toISOString().slice(0, 10);
  const backupRoot = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupRoot, { recursive: true });

  for (const { id } of rows) {
    const dir = path.join(backupRoot, String(id));
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${date}.dump`);
    await new Promise((resolve, reject) => {
      const env = { ...process.env, PGOPTIONS: `-c app.current_company_id=${id}` };
      const cmd = `pg_dump --no-owner --format=custom --file="${filePath}" "$DATABASE_URL"`;
      exec(cmd, { env }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Backup failed for company ${id}: ${stderr}`);
          reject(error);
        } else {
          logger.info(`Backup completed for company ${id}`);
          resolve();
        }
      });
    });
  }
}

if (require.main === module) {
  runTenantBackups().catch((err) => {
    console.error('Backup failed', err);
    process.exit(1);
  });
}

module.exports = { runTenantBackups };
