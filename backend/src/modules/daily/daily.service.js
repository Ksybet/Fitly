const dailyRepository = require('./daily.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toDailyTrackingDto } = require('./daily.mapper');
const {
	getUserLocalDate,
} = require('../settings/user-local-date.service');

async function getToday(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const daily = await dailyRepository.getToday(normalizedUserId, date);
	return toDailyTrackingDto(daily);
}

async function updateToday(userId, data) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const daily = await dailyRepository.upsertToday(
		normalizedUserId,
		date,
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
