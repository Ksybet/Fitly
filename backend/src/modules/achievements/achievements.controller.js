const achievementsService = require('./achievements.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function listAchievements(req, res, next) {
	try {
		const result = await achievementsService.listAchievements(
			currentUserId(req),
			req.achievementQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getAchievement(req, res, next) {
	try {
		const achievement = await achievementsService.getAchievement(
			currentUserId(req),
			req.achievementId,
		);
		return sendSuccess(res, achievement);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listAchievements,
	getAchievement,
};
