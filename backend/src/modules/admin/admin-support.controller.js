const service = require('./admin-support.service');
const { sendSuccess } = require('../../utils/http-response');

async function listRequests(req, res, next) {
	try {
		const result = await service.listRequests(req.adminSupportQuery);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) { return next(error); }
}

async function getRequest(req, res, next) {
	try {
		return sendSuccess(res, await service.getRequest(req.adminSupportRequestId));
	} catch (error) { return next(error); }
}

async function updateStatus(req, res, next) {
	try {
		return sendSuccess(res, await service.updateStatus(req.adminSupportRequestId, req.adminSupportStatus));
	} catch (error) { return next(error); }
}

async function addMessage(req, res, next) {
	try {
		const created = await service.addMessage(
			req.user.userId, req.adminSupportRequestId, req.adminSupportMessage,
		);
		return sendSuccess(res, created, { status: 201 });
	} catch (error) { return next(error); }
}

module.exports = { listRequests, getRequest, updateStatus, addMessage };
