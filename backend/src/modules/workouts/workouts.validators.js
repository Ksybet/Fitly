const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const WORKOUT_TYPES = new Set(['cardio', 'strength', 'stretching', 'yoga']);
const BODY_AREAS = new Set([
	'abs',
	'legs',
	'back',
	'arms',
	'glutes',
	'full_body',
]);
const INTENSITIES = new Set(['low', 'medium', 'high']);
const CATALOG_QUERY_FIELDS = new Set([
	'type',
	'bodyArea',
	'intensity',
	'maxDurationMinutes',
	'page',
	'pageSize',
]);

function parsePositiveInteger(value, field, defaultValue, maximum, details) {
	if (value === undefined) {
		return defaultValue;
	}

	if (
		typeof value !== 'string'
		|| !/^[1-9]\d*$/.test(value)
		|| Number(value) > maximum
	) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be an integer between 1 and ${maximum}`,
		);
		return defaultValue;
	}

	return Number(value);
}

function parseEnum(value, field, allowedValues, details) {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== 'string' || !allowedValues.has(value)) {
		addDetail(
			details,
			field,
			'INVALID_ENUM',
			`${field} has an unsupported value`,
		);
		return undefined;
	}

	return value;
}

function validateWorkoutCatalogQuery(req, res, next) {
	const details = [];

	for (const field of Object.keys(req.query)) {
		if (!CATALOG_QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	const page = parsePositiveInteger(
		req.query.page,
		'page',
		1,
		2147483647,
		details,
	);
	const pageSize = parsePositiveInteger(
		req.query.pageSize,
		'pageSize',
		20,
		100,
		details,
	);
	let maxDurationMinutes;

	if (req.query.maxDurationMinutes !== undefined) {
		const value = req.query.maxDurationMinutes;

		if (
			typeof value !== 'string'
			|| !/^\d+$/.test(value)
			|| Number(value) < 5
			|| Number(value) > 240
		) {
			addDetail(
				details,
				'maxDurationMinutes',
				'OUT_OF_RANGE',
				'maxDurationMinutes must be an integer between 5 and 240',
			);
		} else {
			maxDurationMinutes = Number(value);
		}
	}

	const query = {
		type: parseEnum(req.query.type, 'type', WORKOUT_TYPES, details),
		bodyArea: parseEnum(
			req.query.bodyArea,
			'bodyArea',
			BODY_AREAS,
			details,
		),
		intensity: parseEnum(
			req.query.intensity,
			'intensity',
			INTENSITIES,
			details,
		),
		maxDurationMinutes,
		page,
		pageSize,
	};

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.workoutQuery = query;
	return next();
}

function validateWorkoutId(req, res, next) {
	const value = req.params.workoutId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'workoutId',
				code: 'OUT_OF_RANGE',
				message: 'workoutId must be a positive integer',
			}],
		}));
	}

	req.workoutId = Number(value);
	return next();
}

module.exports = {
	WORKOUT_TYPES,
	BODY_AREAS,
	INTENSITIES,
	validateWorkoutCatalogQuery,
	validateWorkoutId,
};
