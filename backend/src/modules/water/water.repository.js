const { sql, poolPromise } = require('../../config/db');

async function getTodayWater(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT
				ISNULL(SUM(amount_ml), 0) AS totalMl
			FROM WaterEntries
			WHERE user_id = @userId
			  AND CAST(recorded_at AS DATE) = CAST(GETDATE() AS DATE)
		`);

	return result.recordset[0];
}

async function addWater(userId, amountMl) {
	const pool = await poolPromise;

	await pool
		.request()
		.input('userId', sql.Int, userId)
		.input('amountMl', sql.Int, amountMl)
		.query(`
			INSERT INTO WaterEntries (user_id, amount_ml)
			VALUES (@userId, @amountMl)
		`);

	return getTodayWater(userId);
}

async function resetTodayWater(userId) {
	const pool = await poolPromise;

	await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			DELETE FROM WaterEntries
			WHERE user_id = @userId
			  AND CAST(recorded_at AS DATE) = CAST(GETDATE() AS DATE)
		`);

	return getTodayWater(userId);
}

module.exports = {
	getTodayWater,
	addWater,
	resetTodayWater,
};
