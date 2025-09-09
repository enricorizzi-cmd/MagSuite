const crypto = require('crypto');

function generateMfaSecret() {
  return crypto.randomBytes(20).toString('hex');
}

function generateMfaToken(secret, offset = 0) {
  const step = 30;
  const counter = Math.floor(Date.now() / 1000 / step) + offset;
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(counter, 4);
  const hmac = crypto
    .createHmac('sha1', Buffer.from(secret, 'hex'))
    .update(buffer)
    .digest();
  const code = hmac[hmac.length - 1] & 0xf;
  const otp = (hmac.readUInt32BE(code) & 0x7fffffff) % 1000000;
  return otp.toString().padStart(6, '0');
}

function verifyMfaToken(secret, token) {
  return (
    generateMfaToken(secret) === token ||
    generateMfaToken(secret, -1) === token ||
    generateMfaToken(secret, 1) === token
  );
}

module.exports = { generateMfaSecret, generateMfaToken, verifyMfaToken };
