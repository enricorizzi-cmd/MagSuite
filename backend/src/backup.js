const { spawn } = require('child_process');
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
      const args = [
        '--no-owner',
        '--format=custom',
        '--file',
        filePath,
        process.env.DATABASE_URL,
      ];
      const pgDump = spawn('pg_dump', args, { env });

      let stdout = '';
      let stderr = '';

      pgDump.stdout.on('data', (data) => {
        stdout += data;
      });

      pgDump.stderr.on('data', (data) => {
        stderr += data;
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          if (stdout) {
            logger.info(`pg_dump output for company ${id}: ${stdout}`);
          }
          logger.info(`Backup completed for company ${id}`);
          resolve();
        } else {
          if (stderr) {
            logger.error(`pg_dump error for company ${id}: ${stderr}`);
          }
          logger.error(`Backup failed for company ${id} with exit code ${code}`);
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (error) => {
        logger.error(`Failed to start pg_dump for company ${id}: ${error.message}`);
        reject(error);
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
