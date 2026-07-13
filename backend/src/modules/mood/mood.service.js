const moodRepository = require('./mood.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

async function getTodayMood(userId) {
	return moodRepository.getTodayMood(ensureValidUserId(userId));
}

async function updateTodayMood(userId, moodData) {
	if (!moodData || typeof moodData !== 'object' || Array.isArray(moodData)) {
		throw new ApiError(400, 'Mood data is required');
	}

	const moodScore =
		moodData.moodScore !== undefined &&
		moodData.moodScore !== null &&
		moodData.moodScore !== ''
			? Number(moodData.moodScore)
			: null;

	if (
		moodScore !== null &&
		(!Number.isInteger(moodScore) || moodScore < 1 || moodScore > 10)
	) {
		throw new ApiError(400, 'Mood score must be between 1 and 10');
	}

	const moodLabel = typeof moodData.moodLabel === 'string' ? moodData.moodLabel.trim() : '';
	const moodEmoji = typeof moodData.moodEmoji === 'string' ? moodData.moodEmoji.trim() : '';
	if (!moodLabel || !moodEmoji) {
		throw new ApiError(400, 'Mood label and emoji are required');
	}

	if (moodData.note !== undefined && moodData.note !== null && typeof moodData.note !== 'string') {
		throw new ApiError(400, 'Mood note must be a string');
	}

	return moodRepository.upsertTodayMood(ensureValidUserId(userId), {
		moodScore,
		moodLabel,
		moodEmoji,
		note: moodData.note ?? '',
	});
}

module.exports = {
	getTodayMood,
	updateTodayMood,
};
