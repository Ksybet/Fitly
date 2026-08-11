const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');
const {
	WORKOUT_TYPES,
	BODY_AREAS,
	INTENSITIES,
} = require('../workouts/workouts.validators');

const ADMIN_LIST_QUERY_FIELDS = new Set([
	'query',
	'active',
	'page',
	'pageSize',
]);
const EXERCISE_FIELDS = new Set([
	'title',
	'description',
	'type',
	'bodyArea',
	'intensity',
	'instructions',
	'media',
	'isActive',
]);
const EXERCISE_REQUIRED_FIELDS = [
	'title',
	'description',
	'type',
	'bodyArea',
	'intensity',
	'instructions',
];

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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

function validateAdminCatalogQuery(req, res, next) {
	const details = [];
	for (const field of Object.keys(req.query)) {
		if (!ADMIN_LIST_QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let query;
	if (req.query.query !== undefined) {
		if (typeof req.query.query !== 'string') {
			addDetail(details, 'query', 'INVALID_TYPE', 'query must be a string');
		} else if (req.query.query.length > 100) {
			addDetail(details, 'query', 'TOO_LONG', 'query must not exceed 100 characters');
		} else {
			query = req.query.query;
		}
	}

	let active;
	if (req.query.active !== undefined) {
		if (req.query.active !== 'true' && req.query.active !== 'false') {
			addDetail(details, 'active', 'INVALID_TYPE', 'active must be a boolean');
		} else {
			active = req.query.active === 'true';
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

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}
	req.adminCatalogQuery = { query, active, page, pageSize };
	return next();
}

function validateResourceId(paramName, targetName) {
	return (req, res, next) => {
		const value = req.params[paramName];
		if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
			return next(new ApiError(400, 'Request validation failed', {
				details: [{
					field: paramName,
					code: 'OUT_OF_RANGE',
					message: `${paramName} must be a positive integer`,
				}],
			}));
		}
		req[targetName] = Number(value);
		return next();
	};
}

const validateExerciseId = validateResourceId('exerciseId', 'exerciseId');

function validateString(value, field, minimum, maximum, details) {
	if (typeof value !== 'string') {
		addDetail(details, field, 'INVALID_TYPE', `${field} must be a string`);
		return;
	}
	if (value.length < minimum || value.trim().length === 0) {
		addDetail(details, field, 'TOO_SHORT', `${field} must not be blank`);
	} else if (value.length > maximum) {
		addDetail(details, field, 'TOO_LONG', `${field} must not exceed ${maximum} characters`);
	}
}

function validateEnum(value, field, allowedValues, details) {
	if (typeof value !== 'string' || !allowedValues.has(value)) {
		addDetail(details, field, 'INVALID_ENUM', `${field} has an unsupported value`);
	}
}

function isUri(value) {
	if (typeof value !== 'string') {
		return false;
	}
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function validateInstructions(value, details) {
	if (!Array.isArray(value)) {
		addDetail(details, 'instructions', 'INVALID_TYPE', 'instructions must be an array');
		return;
	}
	if (value.length < 1 || value.length > 50) {
		addDetail(details, 'instructions', 'OUT_OF_RANGE', 'instructions must contain between 1 and 50 items');
	}
	value.forEach((instruction, index) => {
		validateString(
			instruction,
			`instructions[${index}]`,
			1,
			1000,
			details,
		);
	});
}

function validateMedia(value, details) {
	if (!Array.isArray(value)) {
		addDetail(details, 'media', 'INVALID_TYPE', 'media must be an array');
		return;
	}
	if (value.length > 10) {
		addDetail(details, 'media', 'OUT_OF_RANGE', 'media must not contain more than 10 items');
	}
	value.forEach((resource, index) => {
		const field = `media[${index}]`;
		if (!isPlainObject(resource)) {
			addDetail(details, field, 'INVALID_TYPE', `${field} must be an object`);
			return;
		}
		if (!Object.prototype.hasOwnProperty.call(resource, 'type')) {
			addDetail(details, `${field}.type`, 'REQUIRED', `${field}.type is required`);
		} else if (resource.type !== 'image' && resource.type !== 'video') {
			addDetail(details, `${field}.type`, 'INVALID_ENUM', `${field}.type has an unsupported value`);
		}
		if (!Object.prototype.hasOwnProperty.call(resource, 'url')) {
			addDetail(details, `${field}.url`, 'REQUIRED', `${field}.url is required`);
		} else if (!isUri(resource.url)) {
			addDetail(details, `${field}.url`, 'INVALID_FORMAT', `${field}.url must be a URI`);
		}
		if (resource.title !== undefined && (typeof resource.title !== 'string' || resource.title.length > 200)) {
			addDetail(details, `${field}.title`, 'INVALID_FORMAT', `${field}.title must be a string up to 200 characters`);
		}
	});
}

function validateExerciseFields(body, details) {
	if (body.title !== undefined) {
		validateString(body.title, 'title', 1, 200, details);
	}
	if (body.description !== undefined) {
		validateString(body.description, 'description', 1, 5000, details);
	}
	if (body.type !== undefined) {
		validateEnum(body.type, 'type', WORKOUT_TYPES, details);
	}
	if (body.bodyArea !== undefined) {
		validateEnum(body.bodyArea, 'bodyArea', BODY_AREAS, details);
	}
	if (body.intensity !== undefined) {
		validateEnum(body.intensity, 'intensity', INTENSITIES, details);
	}
	if (body.instructions !== undefined) {
		validateInstructions(body.instructions, details);
	}
	if (body.media !== undefined) {
		validateMedia(body.media, details);
	}
	if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
		addDetail(details, 'isActive', 'INVALID_TYPE', 'isActive must be a boolean');
	}
}

function exerciseBodyValidator({ partial }) {
	return (req, res, next) => {
		const details = [];
		const validBody = validateObjectBody(req.body, {
			allowedFields: EXERCISE_FIELDS,
			requiredFields: partial ? [] : EXERCISE_REQUIRED_FIELDS,
			minProperties: partial ? 1 : 0,
		}, details);
		if (validBody) {
			validateExerciseFields(req.body, details);
		}
		if (details.length > 0) {
			return next(new ApiError(400, 'Request validation failed', { details }));
		}
		req.adminCatalogBody = req.body;
		return next();
	};
}

const validateCreateExercise = exerciseBodyValidator({ partial: false });
const validateUpdateExercise = exerciseBodyValidator({ partial: true });

module.exports = {
	validateAdminCatalogQuery,
	validateExerciseId,
	validateCreateExercise,
	validateUpdateExercise,
};
