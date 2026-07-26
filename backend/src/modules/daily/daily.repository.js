const { pool } = require('../../config/db');

const dailyColumns = `
	tracking_date::text AS date,
	steps,
	calories::double precision AS calories
`;

async function getToday(userId) {
	const result = await pool.query(
		`SELECT
			CURRENT_DATE::text AS date,
			COALESCE(entry.steps, 0)::integer AS steps,
			COALESCE(entry.calories, 0)::double precision AS calories
		 FROM (SELECT 1) singleton
		 LEFT JOIN daily_tracking entry
		   ON entry.user_id = $1
		  AND entry.tracking_date = CURRENT_DATE`,
		[userId],
	);

	return result.rows[0];
}

async function upsertToday(userId, data) {
	const result = await pool.query(
		`INSERT INTO daily_tracking (
			user_id,
			tracking_date,
			steps,
			calories
		 )
		 VALUES (
			$1,
			CURRENT_DATE,
			COALESCE($2::integer, 0),
			COALESCE($3::numeric, 0)
		 )
		 ON CONFLICT (user_id, tracking_date) DO UPDATE
		 SET steps = COALESCE($2::integer, daily_tracking.steps),
		     calories = COALESCE($3::numeric, daily_tracking.calories),
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
