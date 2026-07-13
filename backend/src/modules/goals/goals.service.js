const goalsRepository = require('./goals.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

async function getGoals(userId) {
	return goalsRepository.getGoalsByUserId(ensureValidUserId(userId));
}

async function updateGoals(userId, goals) {
	if (!Array.isArray(goals)) {
		throw new ApiError(400, 'Goals must be an array');
	}

	const normalizedGoals = goals.map(goal => {
		if (!goal || typeof goal !== 'object' || Array.isArray(goal)) {
			throw new ApiError(400, 'Each goal must be an object');
		}

		const goalType = typeof goal.goalType === 'string' ? goal.goalType.trim() : '';
		const title = typeof goal.title === 'string' ? goal.title.trim() : '';

		if (!goalType || !title) {
			throw new ApiError(400, 'Each goal must have goalType and title');
		}

		let targetValue = goal.targetValue;
		if (targetValue === '') targetValue = null;
		if (targetValue !== undefined && targetValue !== null) {
			targetValue = Number(targetValue);
			if (!Number.isFinite(targetValue)) {
				throw new ApiError(400, 'Goal targetValue must be a finite number');
			}
		}

		return { ...goal, goalType, title, targetValue };
	});

	return goalsRepository.replaceGoals(ensureValidUserId(userId), normalizedGoals);
}

module.exports = {
	getGoals,
	updateGoals,
};
