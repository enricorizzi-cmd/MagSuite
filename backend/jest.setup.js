const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
// Increase default Jest timeout to accommodate server startup and seeding
jest.setTimeout(20000);
