const weightService = require('./weight.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function listEntries(req, res, next) {
	try {
		const result = await weightService.listEntries(
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
		const entry = await weightService.createEntry(
			currentUserId(req),
			req.weightBody,
		);
		return sendSuccess(res, entry, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function getEntry(req, res, next) {
	try {
		const entry = await weightService.getEntry(
			currentUserId(req),
			req.healthEntryId,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

async function updateEntry(req, res, next) {
	try {
		const entry = await weightService.updateEntry(
			currentUserId(req),
			req.healthEntryId,
			req.weightBody,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

async function deleteEntry(req, res, next) {
	try {
		await weightService.deleteEntry(
			currentUserId(req),
			req.healthEntryId,
		);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listEntries,
	createEntry,
	getEntry,
	updateEntry,
	deleteEntry,
};
