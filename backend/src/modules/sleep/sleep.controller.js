const sleepService = require('./sleep.service');

async function getTodaySleep(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const sleep = await sleepService.getTodaySleep(userId);

		return res.json({
			success: true,
			data: sleep,
		});
	} catch (error) {
		next(error);
	}
}

async function updateTodaySleep(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const sleep = await sleepService.updateTodaySleep(userId, req.body);

		return res.json({
			success: true,
			data: sleep,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getTodaySleep,
	updateTodaySleep,
};
