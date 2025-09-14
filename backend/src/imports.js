const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const fs = require('fs/promises');
const os = require('os');
const db = require('./db');

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Default header mappings per import "type"
const DEFAULT_MAPPINGS = {
  items: {
    name: 'name',
    code: 'code',
    uom: 'uom',
  },
};

// Validation helpers for specific fields
const ALLOWED_UOMS = new Set(['pcs', 'kg', 'lb']);
const CODE_REGEX = /^[A-Za-z0-9-]+$/;
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

async function uploadMiddleware(req, res, next) {
  try {
    await new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    next();
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
    return res.status(400).json({ error: err.message });
  }
}

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    filename TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    log JSONB DEFAULT '[]',
    file BYTEA,
    company_id INTEGER DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  
  // Enable RLS and create policies
  await db.query('ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY');
  await db.query(`CREATE POLICY IF NOT EXISTS import_logs_select ON import_logs
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_logs_insert ON import_logs
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_logs_update ON import_logs
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_logs_delete ON import_logs
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int)`);
  
  await db.query(`CREATE TABLE IF NOT EXISTS import_templates (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    mapping JSONB NOT NULL,
    company_id INTEGER DEFAULT NULLIF(current_setting('app.current_company_id', true), '')::int,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  
  // Enable RLS and create policies
  await db.query('ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY');
  await db.query(`CREATE POLICY IF NOT EXISTS import_templates_select ON import_templates
    FOR SELECT USING (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_templates_insert ON import_templates
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_templates_update ON import_templates
    FOR UPDATE USING (company_id = current_setting('app.current_company_id', true)::int)
    WITH CHECK (company_id = current_setting('app.current_company_id', true)::int)`);
  await db.query(`CREATE POLICY IF NOT EXISTS import_templates_delete ON import_templates
    FOR DELETE USING (company_id = current_setting('app.current_company_id', true)::int)`);
})();

async function parseBuffer(buffer, mapping = {}, type = null) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows = [];
  let headers = [];
  worksheet.eachRow((row, rowNumber) => {
    const values = row.values;
    if (rowNumber === 1) {
      headers = values.slice(1).map((v) => v || '');
    } else {
      const obj = {};
      headers.forEach((header, i) => {
        const norm = (header || '').toLowerCase();
        const key =
          mapping[header] ||
          mapping[norm] ||
          (DEFAULT_MAPPINGS[type] && DEFAULT_MAPPINGS[type][norm]) ||
          header;
        obj[key] = values[i + 1] || '';
      });
      rows.push(obj);
    }
  });
  return rows;
}

async function handleImport(type, file, mapping, dryRun = false) {
  const { originalname, path: filePath, size } = file;
  if (size > MAX_FILE_SIZE) {
    await fs.unlink(filePath).catch(() => {});
    throw new Error('File too large');
  }
  const buffer = await fs.readFile(filePath);
  try {
    const rows = await parseBuffer(buffer, mapping, type);
    const log = [];
    let count = 0;
    rows.forEach((row, idx) => {
      const line = idx + 2;
      const errors = [];
      if (!row.name) errors.push('Missing name');
      if (type === 'items') {
        if (row.uom && !ALLOWED_UOMS.has(String(row.uom).toLowerCase())) {
          errors.push(`Invalid UoM ${row.uom}`);
        }
        if (row.code && !CODE_REGEX.test(String(row.code))) {
          errors.push(`Invalid code ${row.code}`);
        }
      }
      if (errors.length) {
        // include the raw row data so the caller can preview and fix it
        log.push({ line, message: errors.join('; '), error: true, row });
        return;
      }
      log.push({ line, message: `Imported ${row.name}`, error: false });
      count++;
    });
    if (!dryRun) {
      const result = await db.query(
        `INSERT INTO import_logs(type, filename, count, log, file)
         VALUES($1,$2,$3,$4::jsonb,$5) RETURNING id`,
        [type, originalname, count, JSON.stringify(log), buffer]
      );
      return { count, id: result.rows[0].id, log };
    }
    return { count, log };
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
}

router.post('/imports/:type/dry-run', uploadMiddleware, async (req, res) => {
  const { type } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  let mapping = {};
  if (req.body.templateId) {
    const tpl = await db.query(
      'SELECT mapping FROM import_templates WHERE id=$1 AND company_id = current_setting(\'app.current_company_id\')::int',
      [req.body.templateId]
    );
    if (tpl.rows[0]) mapping = tpl.rows[0].mapping || {};
  }
  if (req.body.mapping) {
    try {
      mapping = JSON.parse(req.body.mapping);
    } catch (e) {
      /* ignore */
    }
  }
  try {
    const result = await handleImport(type, req.file, mapping, true);
    res.json({ status: 'ok', count: result.count, log: result.log });
  } catch (err) {
    res.status(err.message === 'File too large' ? 413 : 400).json({ error: err.message });
  }
});

router.post('/imports/:type', uploadMiddleware, async (req, res) => {
  const { type } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  let mapping = {};
  if (req.body.templateId) {
    const tpl = await db.query(
      'SELECT mapping FROM import_templates WHERE id=$1 AND company_id = current_setting(\'app.current_company_id\')::int',
      [req.body.templateId]
    );
    if (tpl.rows[0]) mapping = tpl.rows[0].mapping || {};
  }
  if (req.body.mapping) {
    try {
      mapping = JSON.parse(req.body.mapping);
    } catch (e) {
      /* ignore */
    }
  }
  try {
    const result = await handleImport(type, req.file, mapping, false);
    if (req.body.templateName) {
      await db.query(
        `INSERT INTO import_templates(type, name, mapping) VALUES($1,$2,$3::jsonb)`,
        [type, req.body.templateName, JSON.stringify(mapping)]
      );
    }
    res.json({ status: 'ok', count: result.count, id: result.id });
  } catch (err) {
    res.status(err.message === 'File too large' ? 413 : 400).json({ error: err.message });
  }
});

router.get('/system/imports', async (req, res) => {
  const result = await db.query(
    `SELECT id, type, count FROM import_logs WHERE company_id = NULLIF(current_setting('app.current_company_id', true), '')::int ORDER BY id`
  );
  res.json(result.rows);
});

router.get('/imports/:id/log', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'SELECT log FROM import_logs WHERE id=$1 AND company_id = NULLIF(current_setting(\'app.current_company_id\', true), \'\')::int',
    [id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ log: row.log || [] });
});

router.get('/imports/:id/file', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'SELECT filename, file FROM import_logs WHERE id=$1 AND company_id = NULLIF(current_setting(\'app.current_company_id\', true), \'\')::int',
    [id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  res.json({ filename: row.filename, content: row.file ? row.file.toString('base64') : null });
});

router.get('/imports/:id/report', async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query(
    'SELECT log FROM import_logs WHERE id=$1 AND company_id = NULLIF(current_setting(\'app.current_company_id\', true), \'\')::int',
    [id]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).end();
  const log = row.log || [];
  const errors = log.filter((l) => l.error && l.row);
  if (!errors.length) return res.status(200).send('');
  const headerSet = new Set();
  errors.forEach((e) => {
    Object.keys(e.row || {}).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);
  const csvLines = [];
  const escape = (val) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  csvLines.push([...headers, 'error'].join(','));
  errors.forEach((e) => {
    const vals = headers.map((h) => escape(e.row[h]));
    vals.push(escape(e.message));
    csvLines.push(vals.join(','));
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="import-errors.csv"');
  res.send(csvLines.join('\n'));
});

router.get('/imports/templates/:type', async (req, res) => {
  const { type } = req.params;
  const result = await db.query(
    `SELECT id, name, mapping FROM import_templates WHERE type=$1 AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::int ORDER BY id`,
    [type]
  );
  res.json(result.rows);
});

router.post('/imports/templates/:type', async (req, res) => {
  const { type } = req.params;
  const { name, mapping } = req.body;
  if (!name || !mapping) return res.status(400).json({ error: 'Missing name or mapping' });
  await db.query(
    `INSERT INTO import_templates(type, name, mapping) VALUES($1,$2,$3::jsonb)`,
    [type, name, JSON.stringify(mapping)]
  );
  res.status(201).json({ status: 'ok' });
});

module.exports = { router };
