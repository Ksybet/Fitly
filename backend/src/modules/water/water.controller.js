const waterService = require('./water.service');
const { sendSuccess } = require('../../utils/http-response');

async function getTodayWater(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const water = await waterService.getTodayWater(userId);

		return sendSuccess(res, water);
	} catch (error) {
		next(error);
	}
}

async function setTodayWater(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const { amountMl } = req.body;

		const water = await waterService.setTodayWater(userId, amountMl);

		return sendSuccess(res, water);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getTodayWater,
	setTodayWater,
};
