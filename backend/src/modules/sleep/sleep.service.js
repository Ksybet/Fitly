const sleepRepository = require('./sleep.repository');

async function getTodaySleep(userId) {
	return sleepRepository.getTodaySleep(userId);
}

async function updateTodaySleep(userId, sleepData) {
	const sleepStart = sleepData.sleepStart;
	const sleepEnd = sleepData.sleepEnd;
	const sleepHours = Number(sleepData.sleepHours);
	const sleepMinutes = Number(sleepData.sleepMinutes);

	if (!sleepStart || !sleepEnd) {
		const error = new Error('Sleep start and end are required');
		error.statusCode = 400;
		throw error;
	}

	if (
		Number.isNaN(sleepHours) ||
		Number.isNaN(sleepMinutes) ||
		sleepHours < 0 ||
		sleepMinutes < 0 ||
		sleepMinutes > 59
	) {
		const error = new Error('Invalid sleep duration');
		error.statusCode = 400;
		throw error;
	}

	return sleepRepository.upsertTodaySleep(userId, {
		sleepStart,
		sleepEnd,
		sleepHours,
		sleepMinutes,
		sleepQuality: sleepData.sleepQuality || '',
	});
}

module.exports = {
	getTodaySleep,
	updateTodaySleep,
};
