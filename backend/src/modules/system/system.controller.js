const systemService = require('./system.service');
const { sendSuccess } = require('../../utils/http-response');

async function getHealth(req, res, next) {
	try {
		const health = await systemService.getHealth();

		return sendSuccess(res, health);
	} catch (error) {
		return next(error);
	}
}

module.exports = { getHealth };
