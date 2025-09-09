const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

router.post('/storage/upload', upload.single('file'), (req, res) => {
  res.status(201).json({ filename: req.file.filename });
});

router.get('/storage/:filename', (req, res) => {
  const companyId = req.user && req.user.company_id;
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_ROOT, String(companyId), filename);
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(404).end();
    res.json({ filename, content: data.toString('base64') });
  });
});

module.exports = { router };
