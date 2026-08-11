const { pool } = require('../../config/db');

async function recordDailyActivity(userId) {
	const result = await pool.query(
		`INSERT INTO user_activity_daily (
			user_id,
			activity_date,
			last_activity_at
		 )
		 SELECT
			id,
			(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
			CURRENT_TIMESTAMP
		 FROM users
		 WHERE id = $1
		   AND is_active = TRUE
		 ON CONFLICT (user_id, activity_date) DO UPDATE
		 SET last_activity_at = EXCLUDED.last_activity_at
		 RETURNING
			user_id AS "userId",
			activity_date::text AS "activityDate",
			last_activity_at AS "lastActivityAt"`,
		[Number(userId)],
	);

	return result.rows[0] || null;
}

module.exports = { recordDailyActivity };
