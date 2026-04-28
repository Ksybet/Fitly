const waterRepository = require('./water.repository');

async function getTodayWater(userId) {
	return waterRepository.getTodayWater(userId);
}

async function addWater(userId, amountMl) {
	if (!amountMl || Number(amountMl) <= 0) {
		const error = new Error('Amount must be greater than zero');
		error.statusCode = 400;
		throw error;
	}

	return waterRepository.addWater(userId, Number(amountMl));
}

async function resetTodayWater(userId) {
	return waterRepository.resetTodayWater(userId);
}

module.exports = {
	getTodayWater,
	addWater,
	resetTodayWater,
};
