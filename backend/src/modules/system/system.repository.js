const { pool } = require('../../config/db');

async function checkDatabase() {
	await pool.query('SELECT 1');
}

module.exports = { checkDatabase };
