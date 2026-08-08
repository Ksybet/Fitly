const { pool } = require('../../config/db');

async function upsertRecurringSchedule(
	queryable,
	userId,
	type,
	nextRunAt,
) {
	const result = await queryable.query(
		`INSERT INTO notification_schedules (
			user_id,
			type,
			source_key,
			next_run_at,
			status
		 ) VALUES ($1, $2, $3, $4, 'active')
		 ON CONFLICT (source_key) DO UPDATE
		 SET next_run_at = EXCLUDED.next_run_at,
		     status = 'active',
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 RETURNING id, next_run_at AS "nextRunAt"`,
		[userId, type, `${type}:${userId}`, nextRunAt],
	);

	return result.rows[0];
}

async function cancelRecurringSchedule(queryable, userId, type) {
	const result = await queryable.query(
		`UPDATE notification_schedules
		 SET status = 'cancelled',
		     locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1
		   AND type = $2
		   AND status = 'active'`,
		[userId, type],
	);

	return result.rowCount;
}

async function listRecurringSettings(queryable = pool) {
	const result = await queryable.query(
		`SELECT
			users.id AS "userId",
			COALESCE(settings.timezone, 'UTC') AS timezone,
			COALESCE(settings.notifications, '{}'::jsonb) AS notifications
		 FROM users
		 LEFT JOIN user_settings settings ON settings.user_id = users.id
		 WHERE users.is_active = TRUE`,
	);

	return result.rows;
}

module.exports = {
	upsertRecurringSchedule,
	cancelRecurringSchedule,
	listRecurringSettings,
};
