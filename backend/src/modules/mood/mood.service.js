const moodRepository = require('./mood.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toMoodEntryDto } = require('./mood.mapper');
const {
	getUserLocalDate,
} = require('../settings/user-local-date.service');

async function getTodayMood(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const mood = await moodRepository.getTodayMood(normalizedUserId, date);

	return toMoodEntryDto(mood);
}

async function updateTodayMood(userId, moodData) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const mood = await moodRepository.upsertTodayMood(
		normalizedUserId,
		date,
		moodData,
	);

	return toMoodEntryDto(mood);
}

module.exports = {
	getTodayMood,
	updateTodayMood,
};
