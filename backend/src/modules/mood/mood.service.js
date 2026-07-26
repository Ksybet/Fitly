const moodRepository = require('./mood.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toMoodEntryDto } = require('./mood.mapper');

async function getTodayMood(userId) {
	const mood = await moodRepository.getTodayMood(
		ensureValidUserId(userId),
	);

	return toMoodEntryDto(mood);
}

async function updateTodayMood(userId, moodData) {
	const mood = await moodRepository.upsertTodayMood(
		ensureValidUserId(userId),
		moodData,
	);

	return toMoodEntryDto(mood);
}

module.exports = {
	getTodayMood,
	updateTodayMood,
};
