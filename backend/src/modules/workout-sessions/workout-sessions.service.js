const workoutSessionsRepository =
	require('./workout-sessions.repository');
const workoutsRepository = require('../workouts/workouts.repository');
const achievementsRepository =
	require('../achievements/achievements.repository');
const workoutSessionClock = require('./workout-session-clock');
const {
	calculateElapsedSeconds,
	calculatePauseSeconds,
} = require('./workout-session-time');
const {
	toWorkoutSessionDto,
} = require('./workout-sessions.mapper');
const { withTransaction } = require('../../utils/db-transaction');
const { ensureValidUserId } = require('../../utils/validation');
const { ApiError } = require('../../utils/api-error');
const {
	getUserTimezone,
} = require('../settings/user-local-date.service');

const MAX_SQL_INT = 2147483647;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function validationError(field, code, message) {
	return new ApiError(400, 'Request validation failed', {
		details: [{ field, code, message }],
	});
}

function normalizePositiveInteger(value, field) {
	if (
		!Number.isInteger(value)
		|| value < 1
		|| value > MAX_SQL_INT
	) {
		throw validationError(
			field,
			'OUT_OF_RANGE',
			`${field} must be a positive integer`,
		);
	}

	return value;
}

function normalizeWorkoutPlanId(value) {
	if (value === undefined || value === null) {
		return null;
	}

	return normalizePositiveInteger(value, 'workoutPlanId');
}

function normalizeSessionFilters(filters = {}) {
	return {
		from: filters.from,
		to: filters.to,
		status: filters.status,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

function normalizeExerciseResults(exerciseResults = []) {
	if (!Array.isArray(exerciseResults) || exerciseResults.length > 100) {
		throw validationError(
			'exerciseResults',
			'INVALID_ARRAY',
			'exerciseResults must be an array with at most 100 items',
		);
	}

	const exerciseIds = new Set();
	return exerciseResults.map((result, index) => {
		if (!result || typeof result !== 'object' || Array.isArray(result)) {
			throw validationError(
				`exerciseResults[${index}]`,
				'INVALID_TYPE',
				'Exercise result must be an object',
			);
		}

		const exerciseId = normalizePositiveInteger(
			result.exerciseId,
			`exerciseResults[${index}].exerciseId`,
		);
		if (exerciseIds.has(exerciseId)) {
			throw validationError(
				`exerciseResults[${index}].exerciseId`,
				'DUPLICATE_VALUE',
				'exerciseId must be unique within exerciseResults',
			);
		}
		exerciseIds.add(exerciseId);

		if (typeof result.completed !== 'boolean') {
			throw validationError(
				`exerciseResults[${index}].completed`,
				'INVALID_TYPE',
				'completed must be a boolean',
			);
		}

		const normalized = {
			exerciseId,
			completed: result.completed,
		};
		for (const [field, maximum] of [
			['setsCompleted', 100],
			['repetitionsCompleted', 10000],
			['durationSeconds', 86400],
		]) {
			if (result[field] !== undefined) {
				if (
					!Number.isInteger(result[field])
					|| result[field] < 0
					|| result[field] > maximum
				) {
					throw validationError(
						`exerciseResults[${index}].${field}`,
						'OUT_OF_RANGE',
						`${field} is outside the supported range`,
					);
				}
				normalized[field] = result[field];
			}
		}

		return normalized;
	});
}

function normalizeFinishInput(input = {}) {
	const caloriesBurned = input.caloriesBurned;
	if (
		caloriesBurned !== undefined
		&& (
			typeof caloriesBurned !== 'number'
			|| !Number.isFinite(caloriesBurned)
			|| caloriesBurned < 0
			|| caloriesBurned > 5000
		)
	) {
		throw validationError(
			'caloriesBurned',
			'OUT_OF_RANGE',
			'caloriesBurned must be a number between 0 and 5000',
		);
	}

	return {
		caloriesBurned: caloriesBurned ?? null,
		exerciseResults: normalizeExerciseResults(input.exerciseResults),
	};
}

function conflict(code, message) {
	return new ApiError(409, message, { code });
}

function mapStartConstraintError(error) {
	if (!error || error.code !== '23505') {
		throw error;
	}

	if (error.constraint === 'workout_sessions_one_active_per_user_idx') {
		throw conflict(
			'ACTIVE_WORKOUT_SESSION_EXISTS',
			'An active workout session already exists',
		);
	}

	if (
		error.constraint
		=== 'workout_sessions_plan_active_or_completed_idx'
	) {
		throw conflict(
			'WORKOUT_PLAN_SESSION_EXISTS',
			'The workout plan already has a session',
		);
	}

	throw error;
}

function assertPlanCanStart(plan, workoutId) {
	if (plan.status !== 'scheduled') {
		throw conflict(
			'WORKOUT_PLAN_NOT_SCHEDULED',
			'Workout plan is not scheduled',
		);
	}

	if (Number(plan.workoutId) !== workoutId) {
		throw conflict(
			'WORKOUT_PLAN_WORKOUT_MISMATCH',
			'Workout plan references a different workout',
		);
	}
}

async function startWorkoutSession(userId, input) {
	const normalizedUserId = ensureValidUserId(userId);
	const workoutId = normalizePositiveInteger(input.workoutId, 'workoutId');
	const workoutPlanId = normalizeWorkoutPlanId(input.workoutPlanId);
	const workout = await workoutsRepository.getActiveWorkoutById(workoutId);

	if (!workout) {
		throw new ApiError(404, 'Workout not found');
	}

	const active = await workoutSessionsRepository
		.findActiveSessionByUserId(normalizedUserId);
	if (active) {
		throw conflict(
			'ACTIVE_WORKOUT_SESSION_EXISTS',
			'An active workout session already exists',
		);
	}

	const startedAt = workoutSessionClock.now();
	try {
		return await withTransaction(async client => {
			const concurrentActive = await workoutSessionsRepository
				.findActiveSessionByUserId(normalizedUserId, client);
			if (concurrentActive) {
				throw conflict(
					'ACTIVE_WORKOUT_SESSION_EXISTS',
					'An active workout session already exists',
				);
			}

			if (workoutPlanId !== null) {
				const plan = await workoutSessionsRepository
					.findWorkoutPlanForUpdate(
						client,
						normalizedUserId,
						workoutPlanId,
					);
				if (!plan) {
					throw new ApiError(404, 'Workout plan not found');
				}
				assertPlanCanStart(plan, workoutId);

				const hasSession = await workoutSessionsRepository
					.hasActiveOrCompletedSessionForPlan(
						client,
						workoutPlanId,
					);
				if (hasSession) {
					throw conflict(
						'WORKOUT_PLAN_SESSION_EXISTS',
						'The workout plan already has a session',
					);
				}
			}

			const record = await workoutSessionsRepository.createSession(
				client,
				normalizedUserId,
				{ workoutId, workoutPlanId, startedAt },
			);
			return toWorkoutSessionDto(record, startedAt);
		});
	} catch (error) {
		return mapStartConstraintError(error);
	}
}

async function getActiveWorkoutSession(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const record = await workoutSessionsRepository
		.findActiveSessionByUserId(normalizedUserId);

	return record
		? toWorkoutSessionDto(record, workoutSessionClock.now())
		: null;
}

async function listWorkoutSessions(userId, filters = {}) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedFilters = normalizeSessionFilters(filters);
	const timezone = await getUserTimezone(normalizedUserId);
	const result = await workoutSessionsRepository.listSessions(
		normalizedUserId,
		normalizedFilters,
		timezone,
	);
	const currentTime = workoutSessionClock.now();

	return {
		items: result.items.map(record => toWorkoutSessionDto(
			record,
			currentTime,
		)),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getWorkoutSession(userId, sessionId) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedSessionId = normalizePositiveInteger(
		sessionId,
		'sessionId',
	);
	const record = await workoutSessionsRepository.findSessionById(
		normalizedUserId,
		normalizedSessionId,
	);

	if (!record) {
		throw new ApiError(404, 'Workout session not found');
	}

	return toWorkoutSessionDto(record, workoutSessionClock.now());
}

async function lockedOwnedSession(client, userId, sessionId) {
	const session = await workoutSessionsRepository.findSessionForUpdate(
		client,
		userId,
		sessionId,
	);

	if (!session) {
		throw new ApiError(404, 'Workout session not found');
	}

	return session;
}

async function pauseWorkoutSession(userId, sessionId) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedSessionId = normalizePositiveInteger(
		sessionId,
		'sessionId',
	);

	return withTransaction(async client => {
		const session = await lockedOwnedSession(
			client,
			normalizedUserId,
			normalizedSessionId,
		);
		if (session.status !== 'in_progress') {
			throw conflict(
				'WORKOUT_SESSION_NOT_PAUSABLE',
				'Workout session cannot be paused',
			);
		}

		const pausedAt = workoutSessionClock.now();
		const record = await workoutSessionsRepository.pauseSession(
			client,
			normalizedUserId,
			normalizedSessionId,
			pausedAt,
		);
		return toWorkoutSessionDto(record, pausedAt);
	});
}

async function resumeWorkoutSession(userId, sessionId) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedSessionId = normalizePositiveInteger(
		sessionId,
		'sessionId',
	);

	return withTransaction(async client => {
		const session = await lockedOwnedSession(
			client,
			normalizedUserId,
			normalizedSessionId,
		);
		if (session.status !== 'paused') {
			throw conflict(
				'WORKOUT_SESSION_NOT_RESUMABLE',
				'Workout session cannot be resumed',
			);
		}

		const resumedAt = workoutSessionClock.now();
		const pauseSeconds = calculatePauseSeconds(
			session.pausedAt,
			resumedAt,
		);
		const accumulatedPauseSeconds =
			Number(session.accumulatedPauseSeconds) + pauseSeconds;
		const record = await workoutSessionsRepository.resumeSession(
			client,
			normalizedUserId,
			normalizedSessionId,
			accumulatedPauseSeconds,
			resumedAt,
		);
		return toWorkoutSessionDto(record, resumedAt);
	});
}

function assertFinishable(session) {
	if (session.status === 'completed') {
		throw conflict(
			'WORKOUT_SESSION_ALREADY_COMPLETED',
			'Workout session is already completed',
		);
	}

	if (session.status === 'cancelled') {
		throw conflict(
			'WORKOUT_SESSION_CANCELLED',
			'Workout session is cancelled',
		);
	}
}

function assertCancellable(session) {
	if (session.status === 'cancelled') {
		throw conflict(
			'WORKOUT_SESSION_ALREADY_CANCELLED',
			'Workout session is already cancelled',
		);
	}

	if (session.status === 'completed') {
		throw conflict(
			'WORKOUT_SESSION_ALREADY_COMPLETED',
			'Workout session is already completed',
		);
	}
}

async function ensureExercisesBelongToWorkout(
	client,
	workoutId,
	exerciseResults,
) {
	if (exerciseResults.length === 0) {
		return;
	}

	const rows = await workoutSessionsRepository.findExercisesByWorkoutId(
		client,
		workoutId,
	);
	const exerciseIds = new Set(rows.map(row => Number(row.exerciseId)));
	const invalidIndex = exerciseResults.findIndex(
		result => !exerciseIds.has(result.exerciseId),
	);

	if (invalidIndex !== -1) {
		throw validationError(
			`exerciseResults[${invalidIndex}].exerciseId`,
			'NOT_IN_WORKOUT',
			'Exercise does not belong to the workout',
		);
	}
}

function completionTiming(session, completedAt) {
	const currentPauseSeconds = session.status === 'paused'
		? calculatePauseSeconds(session.pausedAt, completedAt)
		: 0;

	return {
		finishedAt: completedAt,
		accumulatedPauseSeconds:
			Number(session.accumulatedPauseSeconds)
			+ currentPauseSeconds,
		elapsedSeconds: calculateElapsedSeconds(session, completedAt),
	};
}

function calculateFallbackCalories(session, elapsedSeconds) {
	const estimatedCalories = Number(session.workoutEstimatedCalories);
	const durationSeconds = Number(session.workoutDurationMinutes) * 60;
	const calories = Math.round(
		estimatedCalories * elapsedSeconds / durationSeconds,
	);

	return Math.min(calories, 5000);
}

async function finishWorkoutSession(userId, sessionId, input = {}) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedSessionId = normalizePositiveInteger(
		sessionId,
		'sessionId',
	);
	const normalizedInput = normalizeFinishInput(input);

	return withTransaction(async client => {
		const session = await lockedOwnedSession(
			client,
			normalizedUserId,
			normalizedSessionId,
		);
		assertFinishable(session);
		await ensureExercisesBelongToWorkout(
			client,
			Number(session.workoutId),
			normalizedInput.exerciseResults,
		);

		const finishedAt = workoutSessionClock.now();
		const timing = completionTiming(session, finishedAt);
		const caloriesBurned = normalizedInput.caloriesBurned === null
			? calculateFallbackCalories(session, timing.elapsedSeconds)
			: normalizedInput.caloriesBurned;
		await workoutSessionsRepository.finishSession(
			client,
			normalizedUserId,
			normalizedSessionId,
			{
				...timing,
				caloriesBurned,
			},
		);
		await workoutSessionsRepository.insertExerciseResults(
			client,
			normalizedSessionId,
			normalizedInput.exerciseResults,
		);

		if (session.workoutPlanId !== null) {
			const plan = await workoutSessionsRepository
				.findWorkoutPlanForUpdate(
					client,
					normalizedUserId,
					Number(session.workoutPlanId),
				);
			if (!plan) {
				throw new ApiError(404, 'Workout plan not found');
			}
			if (plan.status !== 'scheduled') {
				throw conflict(
					'WORKOUT_PLAN_NOT_SCHEDULED',
					'Workout plan is not scheduled',
				);
			}

			const completed = await workoutSessionsRepository
				.completeWorkoutPlan(
					client,
					normalizedUserId,
					Number(session.workoutPlanId),
					normalizedSessionId,
					finishedAt,
				);
			if (!completed) {
				throw conflict(
					'WORKOUT_PLAN_NOT_SCHEDULED',
					'Workout plan is not scheduled',
				);
			}
		}

		await achievementsRepository.awardReachedAchievements(
			client,
			normalizedUserId,
			normalizedInput.exerciseResults.map(result => result.exerciseId),
			finishedAt,
		);

		const record = await workoutSessionsRepository.findSessionById(
			normalizedUserId,
			normalizedSessionId,
			client,
		);
		return toWorkoutSessionDto(record, finishedAt);
	});
}

async function cancelWorkoutSession(userId, sessionId) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedSessionId = normalizePositiveInteger(
		sessionId,
		'sessionId',
	);

	return withTransaction(async client => {
		const session = await lockedOwnedSession(
			client,
			normalizedUserId,
			normalizedSessionId,
		);
		assertCancellable(session);
		const finishedAt = workoutSessionClock.now();
		const timing = completionTiming(session, finishedAt);
		await workoutSessionsRepository.cancelSession(
			client,
			normalizedUserId,
			normalizedSessionId,
			timing,
		);
		const record = await workoutSessionsRepository.findSessionById(
			normalizedUserId,
			normalizedSessionId,
			client,
		);
		return toWorkoutSessionDto(record, finishedAt);
	});
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	normalizeExerciseResults,
	normalizeFinishInput,
	normalizeSessionFilters,
	paginationMeta,
	calculateFallbackCalories,
	assertPlanCanStart,
	assertFinishable,
	assertCancellable,
	startWorkoutSession,
	listWorkoutSessions,
	getActiveWorkoutSession,
	getWorkoutSession,
	pauseWorkoutSession,
	resumeWorkoutSession,
	finishWorkoutSession,
	cancelWorkoutSession,
};
