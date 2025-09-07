const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const router = express.Router();
const upload = multer();

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    log JSONB DEFAULT '[]',
    file BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
})();

function parseBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });
}

router.post('/imports/:type', upload.single('file'), async (req, res) => {
  const { type } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const { originalname, buffer } = req.file;
  try {
    const rows = parseBuffer(buffer);
    const log = [];
    let count = 0;
    rows.forEach((row, idx) => {
      const line = idx + 2;
      if (!row.name) {
        log.push({ line, message: 'Missing name', error: true });
        return;
      }
      log.push({ line, message: `Imported ${row.name}`, error: false });
      count++;
    });
    const result = await db.query(
      `INSERT INTO import_logs(type, filename, count, log, file)
       VALUES($1,$2,$3,$4::jsonb,$5) RETURNING id`,
      [type, originalname, count, JSON.stringify(log), buffer]
    );
    res.json({ status: 'ok', count, id: result.rows[0].id });
  } catch (err) {
    await db.query(
      `INSERT INTO import_logs(type, filename, count, log, file)
       VALUES($1,$2,0,$3::jsonb,$4)`,
      [type, originalname, JSON.stringify([{ line: 0, message: err.message, error: true }]), buffer]
    );
    res.status(400).json({ error: err.message });
  }
});

router.get('/system/imports', async (req, res) => {
  const result = await db.query('SELECT id, type, count FROM import_logs ORDER BY id');
  res.json(result.rows);
});

router.get('/imports/:id/log', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT log FROM import_logs WHERE id=$1', [id]);
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ log: row.log || [] });
});

router.get('/imports/:id/file', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('SELECT filename, file FROM import_logs WHERE id=$1', [id]);
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ filename: row.filename, content: row.file ? row.file.toString('base64') : null });
});

module.exports = { router };
