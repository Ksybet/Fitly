const repo = require('./daily.repository');
const { ApiError } = require('../../utils/api-error');
const {
	ensureValidUserId,
	normalizeOptionalNonNegativeInt,
} = require('../../utils/validation');

async function getToday(userId) {
	return repo.getToday(ensureValidUserId(userId));
}

async function updateToday(userId, data) {
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new ApiError(400, 'Daily data is required');
	}

	return repo.upsertToday(ensureValidUserId(userId), {
		steps: normalizeOptionalNonNegativeInt(data.steps, 'Steps'),
		calories: normalizeOptionalNonNegativeInt(data.calories, 'Calories'),
	});
}

module.exports = {
	getToday,
	updateToday,
};
