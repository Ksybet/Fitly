const goalsRepository = require('./goals.repository');

async function getGoals(userId) {
	return goalsRepository.getGoalsByUserId(userId);
}

async function updateGoals(userId, goals) {
	if (!Array.isArray(goals)) {
		const error = new Error('Goals must be an array');
		error.statusCode = 400;
		throw error;
	}

	for (const goal of goals) {
		if (!goal.goalType || !goal.title) {
			const error = new Error('Each goal must have goalType and title');
			error.statusCode = 400;
			throw error;
		}
	}

	return goalsRepository.replaceGoals(userId, goals);
}

module.exports = {
	getGoals,
	updateGoals,
};
