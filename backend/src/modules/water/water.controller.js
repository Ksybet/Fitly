const waterService = require('./water.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function getTodayWater(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);

		const water = await waterService.getTodayWater(userId);

		return sendSuccess(res, water);
	} catch (error) {
		next(error);
	}
}

async function listEntries(req, res, next) {
	try {
		const result = await waterService.listEntries(
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
		const result = await waterService.createEntry(
			currentUserId(req),
			req.waterBody,
		);
		return sendSuccess(res, result, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateEntry(req, res, next) {
	try {
		const entry = await waterService.updateEntry(
			currentUserId(req),
			req.healthEntryId,
			req.waterBody,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

async function deleteEntry(req, res, next) {
	try {
		await waterService.deleteEntry(
			currentUserId(req),
			req.healthEntryId,
		);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

async function setTodayWater(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const { amountMl } = req.body;

		const water = await waterService.setTodayWater(userId, amountMl);

		return sendSuccess(res, water);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getTodayWater,
	setTodayWater,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
