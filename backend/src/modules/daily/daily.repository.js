const { pool } = require('../../config/db');

const dailyColumns = `
	id,
	user_id AS "userId",
	tracking_date AS "trackingDate",
	steps,
	calories,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getToday(userId) {
	const result = await pool.query(
		`SELECT ${dailyColumns}
		 FROM daily_tracking
		 WHERE user_id = $1
		   AND tracking_date = CURRENT_DATE`,
		[userId],
	);

	return result.rows[0] || null;
}

async function upsertToday(userId, data) {
	const result = await pool.query(
		`INSERT INTO daily_tracking (user_id, tracking_date, steps, calories)
		 VALUES ($1, CURRENT_DATE, $2, $3)
		 ON CONFLICT (user_id, tracking_date)
		 DO UPDATE SET
			steps = EXCLUDED.steps,
			calories = EXCLUDED.calories,
			updated_at = CURRENT_TIMESTAMP
		 RETURNING ${dailyColumns}`,
		[userId, data.steps ?? null, data.calories ?? null],
	);

	return result.rows[0];
}

module.exports = {
	getToday,
	upsertToday,
};
