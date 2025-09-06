const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'accesssecret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refreshsecret';

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, warehouse_id: user.warehouse_id },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

module.exports = { generateTokens, verifyAccessToken };
