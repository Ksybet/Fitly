const waterRepository = require('./water.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toWaterDayDto } = require('./water.mapper');

async function getTodayWater(userId) {
	const water = await waterRepository.getTodayWater(
		ensureValidUserId(userId),
	);

	return toWaterDayDto(water);
}

async function setTodayWater(userId, amountMl) {
	const water = await waterRepository.setTodayWater(
		ensureValidUserId(userId),
		amountMl,
	);

	return toWaterDayDto(water);
}

module.exports = {
	getTodayWater,
	setTodayWater,
};
