const { pool } = require('../../config/db');

async function getTodayWater(userId) {
	const result = await pool.query(
		`SELECT COALESCE(SUM(amount_ml), 0)::integer AS "totalMl"
		 FROM water_entries
		 WHERE user_id = $1
		   AND recorded_at::date = CURRENT_DATE`,
		[userId],
	);

	return result.rows[0];
}

async function addWater(userId, amountMl) {
	await pool.query(
		'INSERT INTO water_entries (user_id, amount_ml) VALUES ($1, $2)',
		[userId, amountMl],
	);

	return getTodayWater(userId);
}

async function resetTodayWater(userId) {
	await pool.query(
		`DELETE FROM water_entries
		 WHERE user_id = $1
		   AND recorded_at::date = CURRENT_DATE`,
		[userId],
	);

	return getTodayWater(userId);
}

module.exports = {
	getTodayWater,
	addWater,
	resetTodayWater,
};
