const { pool } = require('../../config/db');

async function getOverview({ from, to }) {
	const result = await pool.query(
		`SELECT
			(
				SELECT COUNT(*)::integer
				FROM users registered
				WHERE registered.role = 'user'
				  AND registered.created_at >=
					($1::date::timestamp AT TIME ZONE 'UTC')
				  AND registered.created_at <
					(($2::date + 1)::timestamp AT TIME ZONE 'UTC')
			) AS "registeredUsers",
			(
				SELECT COUNT(DISTINCT activity.user_id)::integer
				FROM user_activity_daily activity
				INNER JOIN users active_user ON active_user.id = activity.user_id
				WHERE active_user.role = 'user'
				  AND activity.activity_date BETWEEN $1::date AND $2::date
			) AS "activeUsers"`,
		[from, to],
	);

	return result.rows[0];
}

module.exports = { getOverview };
