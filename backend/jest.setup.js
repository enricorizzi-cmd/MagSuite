const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Ensure USE_PG_MEM is set for all tests
process.env.USE_PG_MEM = 'true';
process.env.DEFAULT_COMPANY_ID = '1';

// Increase default Jest timeout to accommodate server startup and seeding
jest.setTimeout(20000);
