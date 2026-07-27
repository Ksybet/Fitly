const waterRepository = require('./water.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toWaterDayDto } = require('./water.mapper');
const {
	getUserLocalDate,
} = require('../settings/user-local-date.service');

async function getTodayWater(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const water = await waterRepository.getTodayWater(normalizedUserId, date);

	return toWaterDayDto(water);
}

async function setTodayWater(userId, amountMl) {
	const normalizedUserId = ensureValidUserId(userId);
	const date = await getUserLocalDate(normalizedUserId);
	const water = await waterRepository.setTodayWater(
		normalizedUserId,
		date,
		amountMl,
	);

	return toWaterDayDto(water);
}

module.exports = {
	getTodayWater,
	setTodayWater,
};
