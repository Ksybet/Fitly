const adminAnalyticsService = require('./admin-analytics.service');
const { sendSuccess } = require('../../utils/http-response');

async function getOverview(req, res, next) {
	try {
		const overview = await adminAnalyticsService.getOverview(
			req.adminAnalyticsQuery,
		);
		return sendSuccess(res, overview);
	} catch (error) {
		return next(error);
	}
}

module.exports = { getOverview };
