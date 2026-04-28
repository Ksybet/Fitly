const repo = require('./daily.repository');

async function getToday(userId) {
	return repo.getToday(userId);
}

async function updateToday(userId, data) {
	const steps = data.steps ? Number(data.steps) : null;
	const calories = data.calories ? Number(data.calories) : null;

	if (steps !== null && (isNaN(steps) || steps < 0)) {
		throw new Error('Invalid steps');
	}

	if (calories !== null && (isNaN(calories) || calories < 0)) {
		throw new Error('Invalid calories');
	}

	return repo.upsertToday(userId, { steps, calories });
}

module.exports = {
	getToday,
	updateToday,
};
