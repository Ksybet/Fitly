const { pool } = require('../../config/db');

async function claimDueSchedules(now, limit, leaseSeconds, queryable = pool) {
	const result = await queryable.query(
		`WITH due AS (
			SELECT schedule.id
			FROM notification_schedules schedule
			WHERE schedule.status = 'active'
			  AND schedule.next_run_at <= $1
			  AND (schedule.locked_until IS NULL OR schedule.locked_until <= $1)
			ORDER BY schedule.next_run_at ASC, schedule.id ASC
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		 ), claimed AS (
		 UPDATE notification_schedules schedule
		 SET locked_until = $1 + ($3 * INTERVAL '1 second'),
		     updated_at = CURRENT_TIMESTAMP
		 FROM due
		 WHERE schedule.id = due.id
		 RETURNING schedule.*
		 )
		 SELECT
			schedule.id,
			schedule.user_id AS "userId",
			schedule.type,
			schedule.workout_plan_id AS "workoutPlanId",
			schedule.next_run_at AS "nextRunAt",
			COALESCE(settings.timezone, 'UTC') AS timezone,
			COALESCE(settings.notifications, '{}'::jsonb) AS notifications,
			plan.scheduled_at AS "workoutScheduledAt",
			plan.status AS "workoutStatus",
			workout.title AS "workoutTitle"
		 FROM claimed schedule
		 LEFT JOIN workout_plans plan ON plan.id = schedule.workout_plan_id
		 LEFT JOIN workouts workout ON workout.id = plan.workout_id
		 LEFT JOIN user_settings settings ON settings.user_id = schedule.user_id`,
		[now, limit, leaseSeconds],
	);
	return result.rows;
}

async function completeSchedule(queryable = pool, scheduleId) {
	await queryable.query(
		`UPDATE notification_schedules
		 SET status = 'completed', locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[scheduleId],
	);
}

async function reschedule(queryable = pool, scheduleId, nextRunAt) {
	await queryable.query(
		`UPDATE notification_schedules
		 SET next_run_at = $2, locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND status = 'active'`,
		[scheduleId, nextRunAt],
	);
}

async function releaseSchedule(queryable = pool, scheduleId) {
	await queryable.query(
		`UPDATE notification_schedules
		 SET locked_until = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[scheduleId],
	);
}

async function claimUnqueuedNotifications(now, limit, leaseSeconds, queryable = pool) {
	const result = await queryable.query(
		`WITH due AS (
			SELECT notification.id
			FROM notifications notification
			WHERE notification.delivery_queued_at IS NULL
			  AND notification.status IN ('created', 'scheduled')
			  AND notification.created_at <= $1
			  AND (
				notification.delivery_locked_until IS NULL
				OR notification.delivery_locked_until <= $1
			  )
			ORDER BY notification.created_at ASC, notification.id ASC
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		 ), claimed AS (
		 UPDATE notifications notification
		 SET delivery_locked_until = $1 + ($3 * INTERVAL '1 second'),
		     updated_at = CURRENT_TIMESTAMP
		 FROM due
		 WHERE notification.id = due.id
		 RETURNING notification.*
		 )
		 SELECT
			notification.id,
			notification.user_id AS "userId",
			notification.type,
			COALESCE(settings.timezone, 'UTC') AS timezone,
			COALESCE(settings.notifications, '{}'::jsonb) AS notifications
		 FROM claimed notification
		 LEFT JOIN user_settings settings ON settings.user_id = notification.user_id`,
		[now, limit, leaseSeconds],
	);
	return result.rows;
}

async function markNotificationQueued(queryable, notificationId, now) {
	await queryable.query(
		`UPDATE notifications
		 SET delivery_queued_at = $2, delivery_locked_until = NULL,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[notificationId, now],
	);
}

async function withTransaction(callback) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const value = await callback(client);
		await client.query('COMMIT');
		return value;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

module.exports = {
	claimDueSchedules,
	completeSchedule,
	reschedule,
	releaseSchedule,
	claimUnqueuedNotifications,
	markNotificationQueued,
	withTransaction,
};
