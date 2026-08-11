const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 30000,
});

pool.on('error', error => {
	const logger = require('../modules/logging/logger');
	void logger.error('Unexpected PostgreSQL pool error', {
		service: 'database',
		error,
	});
});

async function connectDatabase() {
	await pool.query('SELECT 1');
}

async function closeDatabase() {
	await pool.end();
}

module.exports = {
	pool,
	connectDatabase,
	closeDatabase,
};
