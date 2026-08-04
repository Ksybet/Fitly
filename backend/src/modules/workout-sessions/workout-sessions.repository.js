const { pool } = require('../../config/db');

const sessionColumns = `
	ws.id,
	ws.user_id AS "userId",
	ws.workout_id AS "workoutId",
	ws.workout_plan_id AS "workoutPlanId",
	ws.status,
	ws.started_at AS "startedAt",
	ws.paused_at AS "pausedAt",
	ws.finished_at AS "finishedAt",
	ws.accumulated_pause_seconds AS "accumulatedPauseSeconds",
	ws.elapsed_seconds AS "elapsedSeconds",
	ws.calories_burned AS "caloriesBurned",
	ws.created_at AS "createdAt",
	ws.updated_at AS "updatedAt",
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

async function findExerciseResultsBySessionId(queryable, sessionId) {
	const result = await queryable.query(
		`SELECT
			exercise_id AS "exerciseId",
			completed,
			sets_completed AS "setsCompleted",
			repetitions_completed AS "repetitionsCompleted",
			duration_seconds AS "durationSeconds"
		 FROM workout_session_exercise_results
		 WHERE session_id = $1
		 ORDER BY id ASC`,
		[sessionId],
	);

	return result.rows;
}

async function attachExerciseResults(queryable, record) {
	if (!record) {
		return null;
	}

	return {
		...record,
		exerciseResults: await findExerciseResultsBySessionId(
			queryable,
			record.id,
		),
	};
}

async function attachExerciseResultsToSessions(queryable, records) {
	if (records.length === 0) {
		return [];
	}

	const sessionIds = records.map(record => record.id);
	const result = await queryable.query(
		`SELECT
			session_id AS "sessionId",
			exercise_id AS "exerciseId",
			completed,
			sets_completed AS "setsCompleted",
			repetitions_completed AS "repetitionsCompleted",
			duration_seconds AS "durationSeconds"
		 FROM workout_session_exercise_results
		 WHERE session_id = ANY($1::integer[])
		 ORDER BY session_id ASC, id ASC`,
		[sessionIds],
	);
	const resultsBySessionId = new Map();

	for (const exerciseResult of result.rows) {
		const sessionId = Number(exerciseResult.sessionId);
		if (!resultsBySessionId.has(sessionId)) {
			resultsBySessionId.set(sessionId, []);
		}
		resultsBySessionId.get(sessionId).push(exerciseResult);
	}

	return records.map(record => ({
		...record,
		exerciseResults: resultsBySessionId.get(Number(record.id)) || [],
	}));
}

async function listSessions(userId, filters, timezone) {
	const values = [
		userId,
		timezone,
		filters.from ?? null,
		filters.to ?? null,
		filters.status ?? null,
	];
	const where = `
		ws.user_id = $1
		AND (
			$3::date IS NULL
			OR ws.started_at >= ($3::date::timestamp AT TIME ZONE $2)
		)
		AND (
			$4::date IS NULL
			OR ws.started_at < (($4::date + 1)::timestamp AT TIME ZONE $2)
		)
		AND ($5::varchar IS NULL OR ws.status = $5)
	`;
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM workout_sessions ws
		 WHERE ${where}`,
		values,
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${sessionColumns}
		 FROM workout_sessions ws
		 JOIN workouts w ON w.id = ws.workout_id
		 WHERE ${where}
		 ORDER BY ws.started_at DESC, ws.id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: await attachExerciseResultsToSessions(pool, result.rows),
		total: countResult.rows[0].total,
	};
}

async function findActiveSessionByUserId(userId, queryable = pool) {
	const result = await queryable.query(
		`SELECT ${sessionColumns}
		 FROM workout_sessions ws
		 JOIN workouts w ON w.id = ws.workout_id
		 WHERE ws.user_id = $1
		   AND ws.status IN ('in_progress', 'paused')
		 ORDER BY ws.started_at DESC, ws.id DESC
		 LIMIT 1`,
		[userId],
	);

	return attachExerciseResults(queryable, result.rows[0] || null);
}

async function findSessionById(userId, sessionId, queryable = pool) {
	const result = await queryable.query(
		`SELECT ${sessionColumns}
		 FROM workout_sessions ws
		 JOIN workouts w ON w.id = ws.workout_id
		 WHERE ws.user_id = $1
		   AND ws.id = $2`,
		[userId, sessionId],
	);

	return attachExerciseResults(queryable, result.rows[0] || null);
}

async function findSessionForUpdate(client, userId, sessionId) {
	const result = await client.query(
		`SELECT ${sessionColumns}
		 FROM workout_sessions ws
		 JOIN workouts w ON w.id = ws.workout_id
		 WHERE ws.user_id = $1
		   AND ws.id = $2
		 FOR UPDATE OF ws`,
		[userId, sessionId],
	);

	return attachExerciseResults(client, result.rows[0] || null);
}

async function createSession(client, userId, session) {
	const result = await client.query(
		`INSERT INTO workout_sessions (
			user_id,
			workout_id,
			workout_plan_id,
			started_at,
			updated_at
		 )
		 VALUES ($1, $2, $3, $4, $4)
		 RETURNING id`,
		[
			userId,
			session.workoutId,
			session.workoutPlanId,
			session.startedAt,
		],
	);

	return findSessionById(userId, result.rows[0].id, client);
}

async function pauseSession(client, userId, sessionId, pausedAt) {
	await client.query(
		`UPDATE workout_sessions
		 SET status = 'paused',
		     paused_at = $3,
		     updated_at = $3
		 WHERE user_id = $1
		   AND id = $2`,
		[userId, sessionId, pausedAt],
	);

	return findSessionById(userId, sessionId, client);
}

async function resumeSession(
	client,
	userId,
	sessionId,
	accumulatedPauseSeconds,
	resumedAt,
) {
	await client.query(
		`UPDATE workout_sessions
		 SET status = 'in_progress',
		     paused_at = NULL,
		     accumulated_pause_seconds = $3,
		     updated_at = $4
		 WHERE user_id = $1
		   AND id = $2`,
		[
			userId,
			sessionId,
			accumulatedPauseSeconds,
			resumedAt,
		],
	);

	return findSessionById(userId, sessionId, client);
}

async function finishSession(client, userId, sessionId, completion) {
	await client.query(
		`UPDATE workout_sessions
		 SET status = 'completed',
		     paused_at = NULL,
		     finished_at = $3,
		     accumulated_pause_seconds = $4,
		     elapsed_seconds = $5,
		     calories_burned = $6,
		     updated_at = $3
		 WHERE user_id = $1
		   AND id = $2`,
		[
			userId,
			sessionId,
			completion.finishedAt,
			completion.accumulatedPauseSeconds,
			completion.elapsedSeconds,
			completion.caloriesBurned,
		],
	);
}

async function cancelSession(client, userId, sessionId, completion) {
	await client.query(
		`UPDATE workout_sessions
		 SET status = 'cancelled',
		     paused_at = NULL,
		     finished_at = $3,
		     accumulated_pause_seconds = $4,
		     elapsed_seconds = $5,
		     updated_at = $3
		 WHERE user_id = $1
		   AND id = $2`,
		[
			userId,
			sessionId,
			completion.finishedAt,
			completion.accumulatedPauseSeconds,
			completion.elapsedSeconds,
		],
	);
}

async function insertExerciseResults(client, sessionId, exerciseResults) {
	if (exerciseResults.length === 0) {
		return;
	}

	const values = [];
	const placeholders = exerciseResults.map((exerciseResult, index) => {
		const offset = index * 6;
		values.push(
			sessionId,
			exerciseResult.exerciseId,
			exerciseResult.completed,
			exerciseResult.setsCompleted ?? null,
			exerciseResult.repetitionsCompleted ?? null,
			exerciseResult.durationSeconds ?? null,
		);
		return `(
			$${offset + 1},
			$${offset + 2},
			$${offset + 3},
			$${offset + 4},
			$${offset + 5},
			$${offset + 6}
		)`;
	});

	await client.query(
		`INSERT INTO workout_session_exercise_results (
			session_id,
			exercise_id,
			completed,
			sets_completed,
			repetitions_completed,
			duration_seconds
		 )
		 VALUES ${placeholders.join(', ')}`,
		values,
	);
}

async function findExercisesByWorkoutId(client, workoutId) {
	const result = await client.query(
		`SELECT exercise_id AS "exerciseId"
		 FROM workout_exercises
		 WHERE workout_id = $1`,
		[workoutId],
	);

	return result.rows;
}

async function findWorkoutPlanForUpdate(client, userId, planId) {
	const result = await client.query(
		`SELECT
			id,
			user_id AS "userId",
			workout_id AS "workoutId",
			status,
			completed_session_id AS "completedSessionId"
		 FROM workout_plans
		 WHERE user_id = $1
		   AND id = $2
		 FOR UPDATE`,
		[userId, planId],
	);

	return result.rows[0] || null;
}

async function hasActiveOrCompletedSessionForPlan(client, planId) {
	const result = await client.query(
		`SELECT EXISTS (
			SELECT 1
			FROM workout_sessions
			WHERE workout_plan_id = $1
			  AND status IN ('in_progress', 'paused', 'completed')
		 ) AS "exists"`,
		[planId],
	);

	return result.rows[0].exists;
}

async function completeWorkoutPlan(
	client,
	userId,
	planId,
	sessionId,
	completedAt,
) {
	const result = await client.query(
		`UPDATE workout_plans
		 SET status = 'completed',
		     completed_session_id = $3,
		     updated_at = $4
		 WHERE user_id = $1
		   AND id = $2
		   AND status = 'scheduled'
		 RETURNING id`,
		[userId, planId, sessionId, completedAt],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	listSessions,
	findActiveSessionByUserId,
	findSessionById,
	findSessionForUpdate,
	createSession,
	pauseSession,
	resumeSession,
	finishSession,
	cancelSession,
	insertExerciseResults,
	findExercisesByWorkoutId,
	findWorkoutPlanForUpdate,
	hasActiveOrCompletedSessionForPlan,
	completeWorkoutPlan,
};
