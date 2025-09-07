const nodemailer = require('nodemailer');

/**
 * Send an email with a PDF attachment.
 * Uses a JSON transport so emails are not actually sent during tests.
 *
 * @param {string} to Recipient email address
 * @param {string} subject Email subject
 * @param {Buffer} pdfBuffer PDF file content
 */
async function sendPdf(to, subject, pdfBuffer) {
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  await transporter.sendMail({
    to,
    subject,
    attachments: [{ filename: 'document.pdf', content: pdfBuffer }],
  });
}

module.exports = { sendPdf };
