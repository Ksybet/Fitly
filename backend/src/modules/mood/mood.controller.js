const moodService = require('./mood.service');

async function getTodayMood(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const mood = await moodService.getTodayMood(userId);

		return res.json({
			success: true,
			data: mood,
		});
	} catch (error) {
		next(error);
	}
}

async function updateTodayMood(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const mood = await moodService.updateTodayMood(userId, req.body);

		return res.json({
			success: true,
			data: mood,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getTodayMood,
	updateTodayMood,
};
