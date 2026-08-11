const sleepService = require('./sleep.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function getTodaySleep(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const sleep = await sleepService.getTodaySleep(userId);

		return sendSuccess(res, sleep);
	} catch (error) {
		next(error);
	}
}

async function listEntries(req, res, next) {
	try {
		const result = await sleepService.listEntries(
			currentUserId(req),
			req.healthQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function createEntry(req, res, next) {
	try {
		const sleep = await sleepService.createEntry(
			currentUserId(req),
			req.sleepBody,
		);
		return sendSuccess(res, sleep, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateEntry(req, res, next) {
	try {
		const sleep = await sleepService.updateEntry(
			currentUserId(req),
			req.healthEntryId,
			req.sleepBody,
		);
		return sendSuccess(res, sleep);
	} catch (error) {
		return next(error);
	}
}

async function deleteEntry(req, res, next) {
	try {
		await sleepService.deleteEntry(
			currentUserId(req),
			req.healthEntryId,
		);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

async function updateTodaySleep(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const sleep = await sleepService.updateTodaySleep(userId, req.body);

		return sendSuccess(res, sleep);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getTodaySleep,
	updateTodaySleep,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
