const { ApiError } = require('../../utils/api-error');

const GOAL_FIELDS = new Set([
	'goalType',
	'title',
	'targetValue',
	'unit',
	'startsOn',
	'endsOn',
]);
const GOAL_TYPES = new Set([
	'weight_loss',
	'weight_gain',
	'maintain_shape',
	'steps',
	'water',
	'custom',
]);
const GOAL_UNITS = new Set([
	'kg',
	'steps',
	'ml',
	'workouts',
	'minutes',
	'repetitions',
	'custom',
]);

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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

function addDetail(details, field, code, message) {
	details.push({ field, code, message });
}

function validateGoal(goal, index, details) {
	const path = `goals[${index}]`;

	if (!isPlainObject(goal)) {
		addDetail(details, path, 'INVALID_TYPE', 'Goal must be an object');
		return;
	}

	for (const field of Object.keys(goal)) {
		if (!GOAL_FIELDS.has(field)) {
			addDetail(
				details,
				`${path}.${field}`,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	for (const field of ['goalType', 'title', 'targetValue', 'unit']) {
		if (!Object.prototype.hasOwnProperty.call(goal, field)) {
			addDetail(
				details,
				`${path}.${field}`,
				'REQUIRED',
				`${field} is required`,
			);
		}
	}

	if (
		Object.prototype.hasOwnProperty.call(goal, 'goalType')
		&& (typeof goal.goalType !== 'string' || !GOAL_TYPES.has(goal.goalType))
	) {
		addDetail(
			details,
			`${path}.goalType`,
			'INVALID_ENUM',
			'goalType has an unsupported value',
		);
	}

	if (Object.prototype.hasOwnProperty.call(goal, 'title')) {
		if (typeof goal.title !== 'string') {
			addDetail(
				details,
				`${path}.title`,
				'INVALID_TYPE',
				'title must be a string',
			);
		} else {
			const titleLength = Array.from(goal.title).length;

			if (titleLength < 1 || titleLength > 100) {
				addDetail(
					details,
					`${path}.title`,
					'INVALID_LENGTH',
					'title must contain between 1 and 100 characters',
				);
			}
		}
	}

	if (
		Object.prototype.hasOwnProperty.call(goal, 'targetValue')
		&& (
			typeof goal.targetValue !== 'number'
			|| !Number.isFinite(goal.targetValue)
			|| goal.targetValue < 0
		)
	) {
		addDetail(
			details,
			`${path}.targetValue`,
			'INVALID_VALUE',
			'targetValue must be a non-negative number',
		);
	}

	if (
		Object.prototype.hasOwnProperty.call(goal, 'unit')
		&& (typeof goal.unit !== 'string' || !GOAL_UNITS.has(goal.unit))
	) {
		addDetail(
			details,
			`${path}.unit`,
			'INVALID_ENUM',
			'unit has an unsupported value',
		);
	}

	if (
		Object.prototype.hasOwnProperty.call(goal, 'startsOn')
		&& !isValidDate(goal.startsOn)
	) {
		addDetail(
			details,
			`${path}.startsOn`,
			'INVALID_DATE',
			'startsOn must be a valid date in YYYY-MM-DD format',
		);
	}

	if (
		Object.prototype.hasOwnProperty.call(goal, 'endsOn')
		&& goal.endsOn !== null
		&& !isValidDate(goal.endsOn)
	) {
		addDetail(
			details,
			`${path}.endsOn`,
			'INVALID_DATE',
			'endsOn must be null or a valid date in YYYY-MM-DD format',
		);
	}
}

function validateReplaceGoalsRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (!isPlainObject(body)) {
		addDetail(details, 'body', 'INVALID_TYPE', 'Request body must be an object');
	} else {
		for (const field of Object.keys(body)) {
			if (field !== 'goals') {
				addDetail(
					details,
					field,
					'UNKNOWN_FIELD',
					`${field} is not allowed`,
				);
			}
		}

		if (!Object.prototype.hasOwnProperty.call(body, 'goals')) {
			addDetail(details, 'goals', 'REQUIRED', 'goals is required');
		} else if (!Array.isArray(body.goals)) {
			addDetail(details, 'goals', 'INVALID_TYPE', 'goals must be an array');
		} else {
			if (body.goals.length > 10) {
				addDetail(
					details,
					'goals',
					'TOO_MANY_ITEMS',
					'goals must contain at most 10 items',
				);
			}

			body.goals.forEach((goal, index) => validateGoal(goal, index, details));
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = {
	validateReplaceGoalsRequest,
};
