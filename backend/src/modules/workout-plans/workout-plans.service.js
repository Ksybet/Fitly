const workoutPlansRepository = require('./workout-plans.repository');
const workoutsRepository = require('../workouts/workouts.repository');
const {
	getUserTimezone,
} = require('../settings/user-local-date.service');
const { ensureValidUserId } = require('../../utils/validation');
const {
	isRfc3339DateTime,
} = require('../../utils/request-validation');
const { ApiError } = require('../../utils/api-error');
const { toWorkoutPlanDto } = require('./workout-plans.mapper');

const DEFAULT_REMINDER_MINUTES_BEFORE = 30;
const MAX_REMINDER_MINUTES_BEFORE = 10080;
const MAX_SQL_INT = 2147483647;

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

function normalizeScheduledAt(value) {
	if (!isRfc3339DateTime(value)) {
		throw validationError(
			'scheduledAt',
			'INVALID_DATE_TIME',
			'scheduledAt must be a valid RFC 3339 date-time',
		);
	}

	if (Date.parse(value) <= Date.now()) {
		throw validationError(
			'scheduledAt',
			'SCHEDULED_AT_IN_PAST',
			'Дата тренировки должна находиться в будущем',
		);
	}

	return value;
}

function normalizeReminder(value, defaultValue) {
	if (value === undefined) {
		return defaultValue;
	}

	if (
		!Number.isInteger(value)
		|| value < 0
		|| value > MAX_REMINDER_MINUTES_BEFORE
	) {
		throw validationError(
			'reminderMinutesBefore',
			'OUT_OF_RANGE',
			'reminderMinutesBefore must be an integer between 0 and 10080',
		);
	}

	return value;
}

async function ensureWorkoutAvailable(workoutId) {
	const workout = await workoutsRepository.getActiveWorkoutById(workoutId);

	if (!workout) {
		throw new ApiError(404, 'Workout not found');
	}
}

function assertEditable(workoutPlan) {
	if (workoutPlan.status === 'cancelled') {
		throw new ApiError(409, 'Workout plan is not editable', {
			code: 'WORKOUT_PLAN_NOT_EDITABLE',
		});
	}

	if (workoutPlan.status === 'completed') {
		throw new ApiError(409, 'Workout plan is already completed', {
			code: 'WORKOUT_PLAN_ALREADY_COMPLETED',
		});
	}

	if (workoutPlan.status !== 'scheduled') {
		throw new ApiError(409, 'Workout plan is not editable', {
			code: 'WORKOUT_PLAN_NOT_EDITABLE',
		});
	}
}

function assertCancellable(workoutPlan) {
	if (workoutPlan.status === 'cancelled') {
		throw new ApiError(409, 'Workout plan is already cancelled', {
			code: 'WORKOUT_PLAN_ALREADY_CANCELLED',
		});
	}

	if (workoutPlan.status === 'completed') {
		throw new ApiError(409, 'Workout plan is already completed', {
			code: 'WORKOUT_PLAN_ALREADY_COMPLETED',
		});
	}

	if (workoutPlan.status !== 'scheduled') {
		throw new ApiError(409, 'Workout plan cannot be cancelled', {
			code: 'WORKOUT_PLAN_NOT_EDITABLE',
		});
	}
}

async function getOwnedWorkoutPlan(userId, planId) {
	const workoutPlan = await workoutPlansRepository.getWorkoutPlanById(
		userId,
		planId,
	);

	if (!workoutPlan) {
		throw new ApiError(404, 'Workout plan not found');
	}

	return workoutPlan;
}

async function listWorkoutPlans(userId, filters = {}) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const records = await workoutPlansRepository.listWorkoutPlans(
		normalizedUserId,
		filters,
		timezone,
	);

	return records.map(toWorkoutPlanDto);
}

async function createWorkoutPlan(userId, input) {
	const normalizedUserId = ensureValidUserId(userId);
	const workoutId = normalizePositiveInteger(input.workoutId, 'workoutId');
	const scheduledAt = normalizeScheduledAt(input.scheduledAt);
	const reminderMinutesBefore = normalizeReminder(
		input.reminderMinutesBefore,
		DEFAULT_REMINDER_MINUTES_BEFORE,
	);

	await ensureWorkoutAvailable(workoutId);
	const record = await workoutPlansRepository.createWorkoutPlan(
		normalizedUserId,
		{
			workoutId,
			scheduledAt,
			reminderMinutesBefore,
		},
	);

	return toWorkoutPlanDto(record);
}

async function updateWorkoutPlan(userId, planId, input) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedPlanId = normalizePositiveInteger(planId, 'planId');
	const current = await getOwnedWorkoutPlan(
		normalizedUserId,
		normalizedPlanId,
	);
	assertEditable(current);

	const workoutId = normalizePositiveInteger(input.workoutId, 'workoutId');
	const scheduledAt = normalizeScheduledAt(input.scheduledAt);
	const reminderMinutesBefore = normalizeReminder(
		input.reminderMinutesBefore,
		undefined,
	);
	await ensureWorkoutAvailable(workoutId);

	const record = await workoutPlansRepository.updateWorkoutPlan(
		normalizedUserId,
		normalizedPlanId,
		{
			workoutId,
			scheduledAt,
			reminderMinutesBefore,
		},
	);

	if (!record) {
		const latest = await getOwnedWorkoutPlan(
			normalizedUserId,
			normalizedPlanId,
		);
		assertEditable(latest);
		throw new ApiError(409, 'Workout plan is not editable', {
			code: 'WORKOUT_PLAN_NOT_EDITABLE',
		});
	}

	return toWorkoutPlanDto(record);
}

async function cancelWorkoutPlan(userId, planId) {
	const normalizedUserId = ensureValidUserId(userId);
	const normalizedPlanId = normalizePositiveInteger(planId, 'planId');
	const current = await getOwnedWorkoutPlan(
		normalizedUserId,
		normalizedPlanId,
	);
	assertCancellable(current);

	const record = await workoutPlansRepository.cancelWorkoutPlan(
		normalizedUserId,
		normalizedPlanId,
	);

	if (!record) {
		const latest = await getOwnedWorkoutPlan(
			normalizedUserId,
			normalizedPlanId,
		);
		assertCancellable(latest);
		throw new ApiError(409, 'Workout plan cannot be cancelled', {
			code: 'WORKOUT_PLAN_NOT_EDITABLE',
		});
	}

	return toWorkoutPlanDto(record);
}

module.exports = {
	DEFAULT_REMINDER_MINUTES_BEFORE,
	MAX_REMINDER_MINUTES_BEFORE,
	normalizeScheduledAt,
	normalizeReminder,
	assertEditable,
	assertCancellable,
	listWorkoutPlans,
	createWorkoutPlan,
	updateWorkoutPlan,
	cancelWorkoutPlan,
};
