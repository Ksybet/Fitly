const { ApiError } = require('./api-error');

const MAX_SQL_INT = 2147483647;

function ensureValidUserId(userId) {
	const normalizedUserId = Number(userId);

	if (
		!Number.isSafeInteger(normalizedUserId) ||
		normalizedUserId < 1 ||
		normalizedUserId > MAX_SQL_INT
	) {
		throw new ApiError(400, 'Invalid user id');
	}

	return normalizedUserId;
}

function normalizeOptionalNonNegativeInt(value, fieldName) {
	if (
		value === undefined ||
		value === null ||
		(typeof value === 'string' && value.trim() === '')
	) {
		return null;
	}

	const normalizedValue = Number(value);

	if (
		!Number.isSafeInteger(normalizedValue) ||
		normalizedValue < 0 ||
		normalizedValue > MAX_SQL_INT
	) {
		throw new ApiError(400, `${fieldName} must be a non-negative integer`);
	}

	return normalizedValue;
}

function normalizeRequiredPositiveInt(value, fieldName) {
	if (value === undefined || value === null || value === '') {
		throw new ApiError(400, `${fieldName} is required`);
	}

	const normalizedValue = Number(value);

	if (
		!Number.isSafeInteger(normalizedValue) ||
		normalizedValue < 1 ||
		normalizedValue > MAX_SQL_INT
	) {
		throw new ApiError(400, `${fieldName} must be a positive integer`);
	}

	return normalizedValue;
}

module.exports = {
	ensureValidUserId,
	normalizeOptionalNonNegativeInt,
	normalizeRequiredPositiveInt,
};
