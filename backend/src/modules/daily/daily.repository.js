const { pool } = require('../../config/db');

const dailyColumns = `
	tracking_date::text AS date,
	steps,
	calories::double precision AS calories
`;

async function getToday(userId, date) {
	const result = await pool.query(
		`SELECT
			$2::date::text AS date,
			COALESCE(entry.steps, 0)::integer AS steps,
			COALESCE(entry.calories, 0)::double precision AS calories
		 FROM (SELECT 1) singleton
		 LEFT JOIN daily_tracking entry
		   ON entry.user_id = $1
		  AND entry.tracking_date = $2::date`,
		[userId, date],
	);

	return result.rows[0];
}

async function upsertToday(userId, date, data) {
	const result = await pool.query(
		`INSERT INTO daily_tracking (
			user_id,
			tracking_date,
			steps,
			calories
		 )
		 VALUES (
			$1,
			$2::date,
			COALESCE($3::integer, 0),
			COALESCE($4::numeric, 0)
		 )
		 ON CONFLICT (user_id, tracking_date) DO UPDATE
		 SET steps = COALESCE($3::integer, daily_tracking.steps),
		     calories = COALESCE($4::numeric, daily_tracking.calories),
		     updated_at = CURRENT_TIMESTAMP
		 RETURNING ${dailyColumns}`,
		[userId, date, data.steps ?? null, data.calories ?? null],
	);

	return result.rows[0];
}

module.exports = {
	getToday,
	upsertToday,
};
