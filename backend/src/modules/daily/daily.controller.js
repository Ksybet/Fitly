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

async function listSteps(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const entries = await service.listSteps(userId, req.healthQuery);
		return sendSuccess(res, entries);
	} catch (error) {
		return next(error);
	}
}

async function updateSteps(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const entry = await service.updateSteps(
			userId,
			req.healthDate,
			req.stepsBody.steps,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	getToday,
	updateToday,
	listSteps,
	updateSteps,
};
