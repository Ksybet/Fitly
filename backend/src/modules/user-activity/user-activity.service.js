const userActivityRepository = require('./user-activity.repository');
const { ensureValidUserId } = require('../../utils/validation');

async function recordUserActivity(userId) {
	return userActivityRepository.recordDailyActivity(
		ensureValidUserId(userId),
	);
}

module.exports = { recordUserActivity };
