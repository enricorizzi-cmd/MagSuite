const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const SSO_SECRET = process.env.SSO_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('ACCESS_SECRET and REFRESH_SECRET environment variables are required');
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      warehouse_id: user.warehouse_id,
      company_id: user.company_id,
      permissions: user.permissions,
    },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifySsoToken(token) {
  if (!SSO_SECRET) {
    throw new Error('SSO_SECRET not configured');
  }
  return jwt.verify(token, SSO_SECRET);
}

module.exports = { generateTokens, verifyAccessToken, verifySsoToken };
