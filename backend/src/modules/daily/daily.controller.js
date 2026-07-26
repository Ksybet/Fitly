const service = require('./daily.service');
const { sendSuccess } = require('../../utils/http-response');

async function getToday(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const data = await service.getToday(userId);

		return sendSuccess(res, data);
	} catch (e) {
		next(e);
	}
}

async function updateToday(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const data = await service.updateToday(userId, req.body);

		return sendSuccess(res, data);
	} catch (e) {
		next(e);
	}
}

module.exports = {
	getToday,
	updateToday,
};
