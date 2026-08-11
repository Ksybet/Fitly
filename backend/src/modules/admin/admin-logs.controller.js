const adminLogsService = require('./admin-logs.service');
const { sendSuccess } = require('../../utils/http-response');

async function listLogs(req, res, next) {
	try {
		const result = await adminLogsService.listLogs(req.adminLogsQuery);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

module.exports = { listLogs };
