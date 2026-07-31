const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const MAX_SQL_INT = 2147483647;
const WORKOUT_PLAN_STATUSES = new Set([
	'scheduled',
	'completed',
	'cancelled',
]);
const WORKOUT_PLAN_FIELDS = new Set([
	'workoutId',
	'scheduledAt',
	'reminderMinutesBefore',
]);

function isValidDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day;
}

function validationFailed(details) {
	return new ApiError(400, 'Request validation failed', { details });
}

function validateWorkoutPlanListQuery(req, res, next) {
	const details = [];
	const allowedFields = new Set(['from', 'to', 'status']);
	let from;
	let to;
	let status;

	for (const field of Object.keys(req.query)) {
		if (!allowedFields.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	for (const field of ['from', 'to']) {
		if (req.query[field] !== undefined) {
			if (!isValidDate(req.query[field])) {
				addDetail(
					details,
					field,
					'INVALID_DATE',
					`${field} must be a valid date in YYYY-MM-DD format`,
				);
			} else if (field === 'from') {
				from = req.query[field];
			} else {
				to = req.query[field];
			}
		}
	}

	if (from && to && from > to) {
		addDetail(
			details,
			'to',
			'INVALID_RANGE',
			'to must be greater than or equal to from',
		);
	}

	if (req.query.status !== undefined) {
		if (
			typeof req.query.status !== 'string'
			|| !WORKOUT_PLAN_STATUSES.has(req.query.status)
		) {
			addDetail(
				details,
				'status',
				'INVALID_ENUM',
				'status has an unsupported value',
			);
		} else {
			status = req.query.status;
		}
	}

	if (details.length > 0) {
		return next(validationFailed(details));
	}

	req.workoutPlanQuery = { from, to, status };
	return next();
}

function validateWorkoutPlanId(req, res, next) {
	const value = req.params.planId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > MAX_SQL_INT) {
		return next(validationFailed([{
			field: 'planId',
			code: 'OUT_OF_RANGE',
			message: 'planId must be a positive integer',
		}]));
	}

	req.workoutPlanId = Number(value);
	return next();
}

function validateWorkoutPlanRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: WORKOUT_PLAN_FIELDS,
		requiredFields: ['workoutId', 'scheduledAt'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'workoutId')
			&& (
				!Number.isInteger(body.workoutId)
				|| body.workoutId < 1
				|| body.workoutId > MAX_SQL_INT
			)
		) {
			addDetail(
				details,
				'workoutId',
				'OUT_OF_RANGE',
				'workoutId must be a positive integer',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'scheduledAt')
			&& !isRfc3339DateTime(body.scheduledAt)
		) {
			addDetail(
				details,
				'scheduledAt',
				'INVALID_DATE_TIME',
				'scheduledAt must be a valid RFC 3339 date-time',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(
				body,
				'reminderMinutesBefore',
			)
			&& (
				!Number.isInteger(body.reminderMinutesBefore)
				|| body.reminderMinutesBefore < 0
				|| body.reminderMinutesBefore > 10080
			)
		) {
			addDetail(
				details,
				'reminderMinutesBefore',
				'OUT_OF_RANGE',
				'reminderMinutesBefore must be an integer between 0 and 10080',
			);
		}
	}

	if (details.length > 0) {
		return next(validationFailed(details));
	}

	req.workoutPlanBody = {
		workoutId: body.workoutId,
		scheduledAt: body.scheduledAt,
	};

	if (
		Object.prototype.hasOwnProperty.call(body, 'reminderMinutesBefore')
	) {
		req.workoutPlanBody.reminderMinutesBefore =
			body.reminderMinutesBefore;
	}

	return next();
}

module.exports = {
	isValidDate,
	validateWorkoutPlanListQuery,
	validateWorkoutPlanId,
	validateWorkoutPlanRequest,
};
