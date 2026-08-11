const dailyRepository = require('./daily.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toDailyTrackingDto, toStepEntryDto } = require('./daily.mapper');
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

async function listSteps(userId, filters) {
	const entries = await dailyRepository.listSteps(
		ensureValidUserId(userId),
		filters,
	);

	return entries.map(toStepEntryDto);
}

async function updateSteps(userId, date, steps) {
	const entry = await dailyRepository.upsertSteps(
		ensureValidUserId(userId),
		date,
		steps,
	);

	return toStepEntryDto(entry);
}

module.exports = {
	getToday,
	updateToday,
	listSteps,
	updateSteps,
};
