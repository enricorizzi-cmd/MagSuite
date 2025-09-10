const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.user && req.user.company_id;
    const dir = path.join(UPLOAD_ROOT, String(companyId));
    try {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

const requireKeyInProd = process.env.NODE_ENV === 'production';
if (requireKeyInProd && !process.env.FILE_ENCRYPTION_KEY) {
  throw new Error('FILE_ENCRYPTION_KEY is required in production');
}
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY
  ? Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'base64')
  : crypto.createHash('sha256').update('default_file_encryption_key').digest();
const IV_LENGTH = 12;

router.post('/storage/upload', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const data = fs.readFileSync(filePath);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(filePath, Buffer.concat([iv, tag, encrypted]));
  res.status(201).json({ filename: req.file.filename });
});

router.get('/storage/:filename', (req, res) => {
  const companyId = req.user && req.user.company_id;
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_ROOT, String(companyId), filename);
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(404).end();
    try {
      const iv = data.slice(0, IV_LENGTH);
      const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
      const text = data.slice(IV_LENGTH + 16);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        ENCRYPTION_KEY,
        iv
      );
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
      res.json({ filename, content: decrypted.toString('base64') });
    } catch (e) {
      res.status(500).end();
    }
  });
});

module.exports = { router };
