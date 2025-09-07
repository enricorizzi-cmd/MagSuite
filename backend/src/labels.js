const express = require('express');
const router = express.Router();

router.get('/labels/:template', (req, res) => {
  const { template } = req.params;
  const { text = 'Sample' } = req.query;
  const PDFDocument = require('pdfkit');
  res.setHeader('Content-Type', 'application/pdf');
  const doc = new PDFDocument();
  doc.text(`Template: ${template}`);
  doc.moveDown();
  doc.text(text);
  doc.pipe(res);
  doc.end();
});

module.exports = { router };
