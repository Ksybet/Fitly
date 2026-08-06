const analyticsService = require('./analytics.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function getWeightAnalytics(req, res, next) {
	try {
		const analytics = await analyticsService.getWeightAnalytics(
			currentUserId(req),
			req.analyticsPeriodQuery,
		);
		return sendSuccess(res, analytics);
	} catch (error) {
		return next(error);
	}
}

async function getActivityAnalytics(req, res, next) {
	try {
		const analytics = await analyticsService.getActivityAnalytics(
			currentUserId(req),
			req.analyticsPeriodQuery,
		);
		return sendSuccess(res, analytics);
	} catch (error) {
		return next(error);
	}
}

async function getSleepAnalytics(req, res, next) {
	try {
		const analytics = await analyticsService.getSleepAnalytics(
			currentUserId(req),
			req.analyticsPeriodQuery,
		);
		return sendSuccess(res, analytics);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	getWeightAnalytics,
	getActivityAnalytics,
	getSleepAnalytics,
};
