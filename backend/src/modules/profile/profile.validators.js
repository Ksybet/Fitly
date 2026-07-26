const { ApiError } = require('../../utils/api-error');

const PROFILE_FIELDS = new Set([
	'firstName',
	'birthDate',
	'gender',
	'heightCm',
	'weightKg',
]);
const GENDERS = new Set(['male', 'female', 'other', 'prefer_not_to_say']);

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

function validateUpdateProfileRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (!isPlainObject(body)) {
		addDetail(details, 'body', 'INVALID_TYPE', 'Request body must be an object');
	} else {
		for (const field of Object.keys(body)) {
			if (!PROFILE_FIELDS.has(field)) {
				addDetail(
					details,
					field,
					'UNKNOWN_FIELD',
					`${field} is not allowed`,
				);
			}
		}

		if (Object.keys(body).length === 0) {
			addDetail(
				details,
				'body',
				'MIN_PROPERTIES',
				'At least one profile field is required',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'firstName')
			&& (
				typeof body.firstName !== 'string'
				|| body.firstName.length < 1
				|| body.firstName.length > 100
			)
		) {
			addDetail(
				details,
				'firstName',
				'INVALID_LENGTH',
				'firstName must contain between 1 and 100 characters',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'birthDate')
			&& !isValidDate(body.birthDate)
		) {
			addDetail(
				details,
				'birthDate',
				'INVALID_DATE',
				'birthDate must be a valid date in YYYY-MM-DD format',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'gender')
			&& (
				typeof body.gender !== 'string'
				|| !GENDERS.has(body.gender)
			)
		) {
			addDetail(
				details,
				'gender',
				'INVALID_ENUM',
				'gender has an unsupported value',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'heightCm')
			&& (
				typeof body.heightCm !== 'number'
				|| !Number.isFinite(body.heightCm)
				|| body.heightCm < 50
				|| body.heightCm > 260
			)
		) {
			addDetail(
				details,
				'heightCm',
				'OUT_OF_RANGE',
				'heightCm must be between 50 and 260',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'weightKg')
			&& (
				typeof body.weightKg !== 'number'
				|| !Number.isFinite(body.weightKg)
				|| body.weightKg < 20
				|| body.weightKg > 500
			)
		) {
			addDetail(
				details,
				'weightKg',
				'OUT_OF_RANGE',
				'weightKg must be between 20 and 500',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = { validateUpdateProfileRequest };
