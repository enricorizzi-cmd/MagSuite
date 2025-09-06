const router = require('./routes');
const { authenticateToken, rbac } = require('./middleware');

module.exports = { router, authenticateToken, rbac };
