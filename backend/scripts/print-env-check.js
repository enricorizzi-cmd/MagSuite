console.log('has DATABASE_URL', !!process.env.DATABASE_URL);
console.log('DB_CA_PATH', process.env.DB_CA_PATH || '(none)');
console.log('PGSSLMODE', process.env.PGSSLMODE || '(none)');
