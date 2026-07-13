const sleepRepository = require('./sleep.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

async function getTodaySleep(userId) {
	return sleepRepository.getTodaySleep(ensureValidUserId(userId));
}

async function updateTodaySleep(userId, sleepData) {
	if (!sleepData || typeof sleepData !== 'object' || Array.isArray(sleepData)) {
		throw new ApiError(400, 'Sleep data is required');
	}

	const sleepStart = typeof sleepData.sleepStart === 'string' ? sleepData.sleepStart.trim() : '';
	const sleepEnd = typeof sleepData.sleepEnd === 'string' ? sleepData.sleepEnd.trim() : '';

	if (!sleepStart || !sleepEnd) {
		throw new ApiError(400, 'Sleep start and end are required');
	}

	const sleepHours = Number(sleepData.sleepHours);
	const sleepMinutes = Number(sleepData.sleepMinutes);

	if (
		sleepData.sleepHours === '' ||
		sleepData.sleepMinutes === '' ||
		!Number.isSafeInteger(sleepHours) ||
		!Number.isSafeInteger(sleepMinutes) ||
		sleepHours < 0 ||
		sleepMinutes < 0 ||
		sleepMinutes > 59
	) {
		throw new ApiError(400, 'Invalid sleep duration');
	}

	if (
		sleepData.sleepQuality !== undefined &&
		sleepData.sleepQuality !== null &&
		typeof sleepData.sleepQuality !== 'string'
	) {
		throw new ApiError(400, 'Sleep quality must be a string');
	}

	return sleepRepository.upsertTodaySleep(ensureValidUserId(userId), {
		sleepStart,
		sleepEnd,
		sleepHours,
		sleepMinutes,
		sleepQuality: sleepData.sleepQuality ?? '',
	});
}

module.exports = {
	getTodaySleep,
	updateTodaySleep,
};
