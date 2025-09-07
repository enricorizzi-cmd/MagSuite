const nodemailer = require('nodemailer');
const logger = require('./logger');

async function sendHealthAlert(message) {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  try {
    await transporter.sendMail({ to, subject: 'Health check failed', text: message });
  } catch (err) {
    logger.error('Failed to send alert email', err);
  }
}

module.exports = { sendHealthAlert };
