const goalsService = require('./goals.service');

async function getGoals(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const goals = await goalsService.getGoals(userId);

		return res.json({
			success: true,
			data: goals,
		});
	} catch (error) {
		next(error);
	}
}

async function updateGoals(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const goals = req.body.goals;

		const updatedGoals = await goalsService.updateGoals(userId, goals);

		return res.json({
			success: true,
			data: updatedGoals,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getGoals,
	updateGoals,
};
