const diaryService = require('./diary.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function listEntries(req, res, next) {
	try {
		const result = await diaryService.listEntries(
			currentUserId(req),
			req.diaryQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function createEntry(req, res, next) {
	try {
		const entry = await diaryService.createEntry(
			currentUserId(req),
			req.diaryBody,
		);
		return sendSuccess(res, entry, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function getEntry(req, res, next) {
	try {
		const entry = await diaryService.getEntry(
			currentUserId(req),
			req.diaryEntryId,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

async function updateEntry(req, res, next) {
	try {
		const entry = await diaryService.updateEntry(
			currentUserId(req),
			req.diaryEntryId,
			req.diaryBody,
		);
		return sendSuccess(res, entry);
	} catch (error) {
		return next(error);
	}
}

async function deleteEntry(req, res, next) {
	try {
		await diaryService.deleteEntry(
			currentUserId(req),
			req.diaryEntryId,
		);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	currentUserId,
	listEntries,
	createEntry,
	getEntry,
	updateEntry,
	deleteEntry,
};
