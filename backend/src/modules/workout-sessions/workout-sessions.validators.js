const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const MAX_SQL_INT = 2147483647;
const START_FIELDS = new Set(['workoutId', 'workoutPlanId']);
const FINISH_FIELDS = new Set(['caloriesBurned', 'exerciseResults']);
const EXERCISE_RESULT_FIELDS = new Set([
	'exerciseId',
	'completed',
	'setsCompleted',
	'repetitionsCompleted',
	'durationSeconds',
]);

function validationFailed(details) {
	return new ApiError(400, 'Request validation failed', { details });
}

function isPositiveSqlInteger(value) {
	return Number.isInteger(value)
		&& value >= 1
		&& value <= MAX_SQL_INT;
}

function validateWorkoutSessionId(req, res, next) {
	const value = req.params.sessionId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > MAX_SQL_INT) {
		return next(validationFailed([{
			field: 'sessionId',
			code: 'OUT_OF_RANGE',
			message: 'sessionId must be a positive integer',
		}]));
	}

	req.workoutSessionId = Number(value);
	return next();
}

function validateStartWorkoutSession(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: START_FIELDS,
		requiredFields: ['workoutId'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'workoutId')
			&& !isPositiveSqlInteger(body.workoutId)
		) {
			addDetail(
				details,
				'workoutId',
				'OUT_OF_RANGE',
				'workoutId must be a positive integer',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'workoutPlanId')
			&& body.workoutPlanId !== null
			&& !isPositiveSqlInteger(body.workoutPlanId)
		) {
			addDetail(
				details,
				'workoutPlanId',
				'OUT_OF_RANGE',
				'workoutPlanId must be a positive integer or null',
			);
		}
	}

	if (details.length > 0) {
		return next(validationFailed(details));
	}

	req.workoutSessionStartBody = {
		workoutId: body.workoutId,
		workoutPlanId: body.workoutPlanId ?? null,
	};
	return next();
}

function validateOptionalInteger(
	item,
	index,
	field,
	maximum,
	details,
) {
	if (
		Object.prototype.hasOwnProperty.call(item, field)
		&& (
			!Number.isInteger(item[field])
			|| item[field] < 0
			|| item[field] > maximum
		)
	) {
		addDetail(
			details,
			`exerciseResults[${index}].${field}`,
			'OUT_OF_RANGE',
			`${field} must be an integer between 0 and ${maximum}`,
		);
	}
}

function validateExerciseResult(item, index, details, exerciseIds) {
	const fieldPrefix = `exerciseResults[${index}]`;

	if (!validateObjectBody(item, {
		allowedFields: EXERCISE_RESULT_FIELDS,
		requiredFields: ['exerciseId', 'completed'],
	}, details)) {
		return;
	}

	if (Object.prototype.hasOwnProperty.call(item, 'exerciseId')) {
		if (!isPositiveSqlInteger(item.exerciseId)) {
			addDetail(
				details,
				`${fieldPrefix}.exerciseId`,
				'OUT_OF_RANGE',
				'exerciseId must be a positive integer',
			);
		} else if (exerciseIds.has(item.exerciseId)) {
			addDetail(
				details,
				`${fieldPrefix}.exerciseId`,
				'DUPLICATE_VALUE',
				'exerciseId must be unique within exerciseResults',
			);
		} else {
			exerciseIds.add(item.exerciseId);
		}
	}

	if (
		Object.prototype.hasOwnProperty.call(item, 'completed')
		&& typeof item.completed !== 'boolean'
	) {
		addDetail(
			details,
			`${fieldPrefix}.completed`,
			'INVALID_TYPE',
			'completed must be a boolean',
		);
	}

	validateOptionalInteger(item, index, 'setsCompleted', 100, details);
	validateOptionalInteger(
		item,
		index,
		'repetitionsCompleted',
		10000,
		details,
	);
	validateOptionalInteger(
		item,
		index,
		'durationSeconds',
		86400,
		details,
	);
}

function validateFinishWorkoutSession(req, res, next) {
	const details = [];
	const body = req.body === undefined ? {} : req.body;

	if (validateObjectBody(body, {
		allowedFields: FINISH_FIELDS,
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'caloriesBurned')
			&& (
				typeof body.caloriesBurned !== 'number'
				|| !Number.isFinite(body.caloriesBurned)
				|| body.caloriesBurned < 0
				|| body.caloriesBurned > 5000
			)
		) {
			addDetail(
				details,
				'caloriesBurned',
				'OUT_OF_RANGE',
				'caloriesBurned must be a number between 0 and 5000',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'exerciseResults')
			&& (
				!Array.isArray(body.exerciseResults)
				|| body.exerciseResults.length > 100
			)
		) {
			addDetail(
				details,
				'exerciseResults',
				'INVALID_ARRAY',
				'exerciseResults must be an array with at most 100 items',
			);
		} else if (Array.isArray(body.exerciseResults)) {
			const exerciseIds = new Set();
			body.exerciseResults.forEach((item, index) => {
				validateExerciseResult(
					item,
					index,
					details,
					exerciseIds,
				);
			});
		}
	}

	if (details.length > 0) {
		return next(validationFailed(details));
	}

	req.workoutSessionFinishBody = {
		caloriesBurned: body.caloriesBurned,
		exerciseResults: body.exerciseResults || [],
	};
	return next();
}

module.exports = {
	validateWorkoutSessionId,
	validateStartWorkoutSession,
	validateFinishWorkoutSession,
};
