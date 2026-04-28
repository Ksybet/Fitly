const moodRepository = require('./mood.repository');

async function getTodayMood(userId) {
	return moodRepository.getTodayMood(userId);
}

async function updateTodayMood(userId, moodData) {
	const moodScore =
		moodData.moodScore !== undefined && moodData.moodScore !== null
			? Number(moodData.moodScore)
			: null;

	if (moodScore !== null && (Number.isNaN(moodScore) || moodScore < 1 || moodScore > 10)) {
		const error = new Error('Mood score must be between 1 and 10');
		error.statusCode = 400;
		throw error;
	}

	if (!moodData.moodLabel || !moodData.moodEmoji) {
		const error = new Error('Mood label and emoji are required');
		error.statusCode = 400;
		throw error;
	}

	return moodRepository.upsertTodayMood(userId, {
		moodScore,
		moodLabel: moodData.moodLabel,
		moodEmoji: moodData.moodEmoji,
		note: moodData.note || '',
	});
}

module.exports = {
	getTodayMood,
	updateTodayMood,
};
