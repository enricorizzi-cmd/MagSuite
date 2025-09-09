const express = require('express');
const fs = require('fs');
const path = require('path');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const Jimp = require('jimp');

const router = express.Router();

function loadTemplate(name) {
  const file = path.join(__dirname, '..', 'templates', `${name}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function renderBarcode(field, value) {
  if (!value) return null;
  const sym = (field.symbology || '').toLowerCase();
  if (sym === 'qrcode' || sym === 'qr') {
    return QRCode.toBuffer(value, { width: field.width || 100, margin: 0 });
  }
  const map = { ean13: 'ean13', 'upc-a': 'upca', upca: 'upca', code128: 'code128' };
  const bcid = map[sym] || sym;
  return bwipjs.toBuffer({
    bcid,
    text: value,
    scale: field.scale || 3,
    height: field.height || 10,
    includetext: false,
  });
}

async function drawPdf(doc, tpl, data) {
  if (tpl.logo && tpl.logo.path) {
    const p = path.join(__dirname, '..', tpl.logo.path);
    if (fs.existsSync(p)) {
      doc.image(p, tpl.logo.x || 0, tpl.logo.y || 0, { width: tpl.logo.width });
    }
  }
  for (const field of tpl.fields || []) {
    const val = data[field.key] || '';
    if (field.type === 'text') {
      doc.fontSize(field.fontSize || 12).text(val, field.x, field.y);
    } else if (field.type === 'barcode') {
      const buf = await renderBarcode(field, val);
      if (buf) {
        doc.image(buf, field.x, field.y, { width: field.width, height: field.height });
      }
    }
  }
}

async function renderPdf(tpl, data) {
  const doc = new PDFDocument({ size: [tpl.width, tpl.height] });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  await drawPdf(doc, tpl, data);
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

async function renderPng(tpl, data) {
  const img = new Jimp.Jimp({ width: tpl.width, height: tpl.height, color: 0xffffffff });
  if (tpl.logo && tpl.logo.path) {
    const p = path.join(__dirname, '..', tpl.logo.path);
    if (fs.existsSync(p)) {
      const logo = await Jimp.Jimp.read(p);
      if (tpl.logo.width) logo.resize({ w: tpl.logo.width, h: tpl.logo.height || tpl.logo.width });
      img.composite(logo, tpl.logo.x || 0, tpl.logo.y || 0);
    }
  }
  for (const field of tpl.fields || []) {
    const val = data[field.key] || '';
    if (field.type === 'text') {
      // Font constants are not bundled in Jimp 1.x; skip text for PNG output
      continue;
    } else if (field.type === 'barcode') {
      const buf = await renderBarcode(field, val);
      if (buf) {
        const bc = await Jimp.Jimp.read(buf);
        if (field.width && field.height) bc.resize({ w: field.width, h: field.height });
        img.composite(bc, field.x, field.y);
      }
    }
  }
  return img.getBuffer('image/png');
}

router.get('/labels/:template', async (req, res) => {
  const tpl = loadTemplate(req.params.template);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  const format = (req.query.format || 'pdf').toLowerCase();
  try {
    const data = req.query;
    const buffer =
      format === 'png' ? await renderPng(tpl, data) : await renderPdf(tpl, data);
    res.json({ content: buffer.toString('base64') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate label' });
  }
});

router.post('/labels/:template/batch', async (req, res) => {
  const tpl = loadTemplate(req.params.template);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  const format = (req.body.format || 'pdf').toLowerCase();
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'No items provided' });
  try {
    if (format === 'png') {
      const out = [];
      for (const it of items) {
        const buf = await renderPng(tpl, it);
        out.push(buf.toString('base64'));
      }
      res.json({ items: out });
    } else {
      const doc = new PDFDocument({ size: [tpl.width, tpl.height] });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      for (let i = 0; i < items.length; i++) {
        if (i > 0) doc.addPage();
        await drawPdf(doc, tpl, items[i]);
      }
      doc.end();
      doc.on('end', () => {
        res.json({ content: Buffer.concat(chunks).toString('base64') });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate labels' });
  }
});

module.exports = { router };

