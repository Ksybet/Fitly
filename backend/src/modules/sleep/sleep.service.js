const sleepRepository = require('./sleep.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const { toSleepEntryDto } = require('./sleep.mapper');

async function getTodaySleep(userId) {
	const sleep = await sleepRepository.getTodaySleep(
		ensureValidUserId(userId),
	);

	return toSleepEntryDto(sleep);
}

async function updateTodaySleep(userId, sleepData) {
	const sleepStart = new Date(sleepData.sleepStart);
	const sleepEnd = new Date(sleepData.sleepEnd);
	const durationMinutes = (sleepEnd.getTime() - sleepStart.getTime()) / 60000;

	if (durationMinutes < 1 || durationMinutes > 1440) {
		throw new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'sleepEnd',
				code: 'INVALID_INTERVAL',
				message: 'sleepEnd must be after sleepStart by at most 24 hours',
			}],
		});
	}

	const sleep = await sleepRepository.upsertTodaySleep(
		ensureValidUserId(userId),
		{
			sleepStart: sleepData.sleepStart,
			sleepEnd: sleepData.sleepEnd,
			sleepQuality: sleepData.sleepQuality,
		},
	);

	return toSleepEntryDto(sleep);
}

module.exports = {
	getTodaySleep,
	updateTodaySleep,
};
