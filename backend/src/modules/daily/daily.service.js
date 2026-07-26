const dailyRepository = require('./daily.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toDailyTrackingDto } = require('./daily.mapper');

async function getToday(userId) {
	const daily = await dailyRepository.getToday(ensureValidUserId(userId));
	return toDailyTrackingDto(daily);
}

async function updateToday(userId, data) {
	const daily = await dailyRepository.upsertToday(
		ensureValidUserId(userId),
		{
			steps: data.steps,
			calories: data.calories,
		},
	);

	return toDailyTrackingDto(daily);
}

module.exports = {
	getToday,
	updateToday,
};
