const analyticsService = require('./analytics.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function getActivityAnalytics(req, res, next) {
	try {
		const analytics = await analyticsService.getActivityAnalytics(
			currentUserId(req),
			req.activityAnalyticsQuery,
		);
		return sendSuccess(res, analytics);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	getActivityAnalytics,
};
