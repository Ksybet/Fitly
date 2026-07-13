const waterRepository = require('./water.repository');
const {
	ensureValidUserId,
	normalizeRequiredPositiveInt,
} = require('../../utils/validation');

async function getTodayWater(userId) {
	return waterRepository.getTodayWater(ensureValidUserId(userId));
}

async function addWater(userId, amountMl) {
	return waterRepository.addWater(
		ensureValidUserId(userId),
		normalizeRequiredPositiveInt(amountMl, 'Amount'),
	);
}

async function resetTodayWater(userId) {
	return waterRepository.resetTodayWater(ensureValidUserId(userId));
}

module.exports = {
	getTodayWater,
	addWater,
	resetTodayWater,
};
