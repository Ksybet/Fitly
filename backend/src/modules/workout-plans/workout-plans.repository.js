const { pool } = require('../../config/db');

const workoutPlanColumns = `
	wp.id,
	wp.workout_id AS "workoutId",
	wp.scheduled_at AS "scheduledAt",
	wp.reminder_minutes_before AS "reminderMinutesBefore",
	wp.status,
	wp.completed_session_id AS "completedSessionId",
	wp.created_at AS "createdAt",
	wp.updated_at AS "updatedAt",
	w.title AS "workoutTitle",
	w.description AS "workoutDescription",
	w.type AS "workoutType",
	w.body_area AS "workoutBodyArea",
	w.intensity AS "workoutIntensity",
	w.duration_minutes AS "workoutDurationMinutes",
	w.estimated_calories AS "workoutEstimatedCalories",
	w.image_url AS "workoutImageUrl",
	w.is_active AS "workoutIsActive"
`;

async function getWorkoutPlanById(userId, planId) {
	const result = await pool.query(
		`SELECT ${workoutPlanColumns}
		 FROM workout_plans wp
		 JOIN workouts w ON w.id = wp.workout_id
		 WHERE wp.user_id = $1
		   AND wp.id = $2`,
		[userId, planId],
	);

	return result.rows[0] || null;
}

async function listWorkoutPlans(userId, filters, timezone) {
	const result = await pool.query(
		`SELECT ${workoutPlanColumns}
		 FROM workout_plans wp
		 JOIN workouts w ON w.id = wp.workout_id
		 WHERE wp.user_id = $1
		   AND (
				$3::date IS NULL
				OR wp.scheduled_at >= (
					$3::date::timestamp AT TIME ZONE $2
				)
		   )
		   AND (
				$4::date IS NULL
				OR wp.scheduled_at < (
					($4::date + 1)::timestamp AT TIME ZONE $2
				)
		   )
		   AND ($5::varchar IS NULL OR wp.status = $5)
		 ORDER BY wp.scheduled_at ASC, wp.id ASC`,
		[
			userId,
			timezone,
			filters.from ?? null,
			filters.to ?? null,
			filters.status ?? null,
		],
	);

	return result.rows;
}

async function createWorkoutPlan(userId, workoutPlan) {
	const result = await pool.query(
		`INSERT INTO workout_plans (
			user_id,
			workout_id,
			scheduled_at,
			reminder_minutes_before
		 )
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		[
			userId,
			workoutPlan.workoutId,
			workoutPlan.scheduledAt,
			workoutPlan.reminderMinutesBefore,
		],
	);

	return getWorkoutPlanById(userId, result.rows[0].id);
}

async function updateWorkoutPlan(userId, planId, workoutPlan) {
	const result = await pool.query(
		`UPDATE workout_plans
		 SET workout_id = $3,
		     scheduled_at = $4,
		     reminder_minutes_before = COALESCE(
				$5::integer,
				reminder_minutes_before
		     ),
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		   AND user_id = $2
		   AND status = 'scheduled'
		 RETURNING id`,
		[
			planId,
			userId,
			workoutPlan.workoutId,
			workoutPlan.scheduledAt,
			workoutPlan.reminderMinutesBefore ?? null,
		],
	);

	if (!result.rows[0]) {
		return null;
	}

	return getWorkoutPlanById(userId, result.rows[0].id);
}

async function cancelWorkoutPlan(userId, planId) {
	const result = await pool.query(
		`UPDATE workout_plans
		 SET status = 'cancelled',
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1
		   AND user_id = $2
		   AND status = 'scheduled'
		 RETURNING id`,
		[planId, userId],
	);

	if (!result.rows[0]) {
		return null;
	}

	return getWorkoutPlanById(userId, result.rows[0].id);
}

module.exports = {
	getWorkoutPlanById,
	listWorkoutPlans,
	createWorkoutPlan,
	updateWorkoutPlan,
	cancelWorkoutPlan,
};
