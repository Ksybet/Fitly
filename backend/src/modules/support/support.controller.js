const supportService = require('./support.service');
const { sendSuccess, sendActionCompleted } = require('../../utils/http-response');

async function listRequests(req, res, next) {
	try {
		const result = await supportService.listRequests(req.user.userId, req.supportQuery);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) { return next(error); }
}

async function createRequest(req, res, next) {
	try {
		const created = await supportService.createRequest(req.user.userId, req.supportBody);
		return sendSuccess(res, created, { status: 201 });
	} catch (error) { return next(error); }
}

async function getRequest(req, res, next) {
	try {
		const found = await supportService.getRequest(req.user.userId, req.supportRequestId);
		return sendSuccess(res, found);
	} catch (error) { return next(error); }
}

async function addMessage(req, res, next) {
	try {
		const created = await supportService.addMessage(req.user.userId, req.supportRequestId, req.supportMessage);
		return sendSuccess(res, created, { status: 201 });
	} catch (error) { return next(error); }
}

async function closeRequest(req, res, next) {
	try {
		await supportService.closeRequest(req.user.userId, req.supportRequestId);
		return sendActionCompleted(res);
	} catch (error) { return next(error); }
}

module.exports = { listRequests, createRequest, getRequest, addMessage, closeRequest };
