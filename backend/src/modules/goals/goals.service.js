const goalsRepository = require('./goals.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toGoalDto } = require('./goals.mapper');

async function getGoals(userId) {
	const goals = await goalsRepository.getGoalsByUserId(
		ensureValidUserId(userId),
	);

	return goals.map(toGoalDto);
}

async function updateGoals(userId, goals) {
	const updatedGoals = await goalsRepository.replaceGoals(
		ensureValidUserId(userId),
		goals,
	);

	return updatedGoals.map(toGoalDto);
}

module.exports = {
	getGoals,
	updateGoals,
};
