const goalsService = require('./goals.service');
const { sendSuccess } = require('../../utils/http-response');

async function getGoals(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const goals = await goalsService.getGoals(userId);

		return sendSuccess(res, { goals });
	} catch (error) {
		next(error);
	}
}

async function updateGoals(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const goals = req.body.goals;

		const updatedGoals = await goalsService.updateGoals(userId, goals);

		return sendSuccess(res, { goals: updatedGoals });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getGoals,
	updateGoals,
};
