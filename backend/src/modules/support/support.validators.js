const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const STATUSES = new Set(['created', 'in_review', 'resolved', 'closed']);
const CATEGORIES = new Set(['question', 'problem', 'complaint', 'billing', 'other']);
const LIST_FIELDS = new Set(['status', 'page', 'pageSize']);

function fail(details, next) {
	return next(new ApiError(400, 'Request validation failed', { details }));
}

function positiveInteger(value, field, defaultValue, maximum, details) {
	if (value === undefined) return defaultValue;
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > maximum) {
		addDetail(details, field, 'OUT_OF_RANGE', `${field} must be between 1 and ${maximum}`);
		return defaultValue;
	}
	return Number(value);
}

function validateListQuery(req, res, next) {
	const details = [];
	for (const field of Object.keys(req.query)) {
		if (!LIST_FIELDS.has(field)) addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
	}
	let status;
	if (req.query.status !== undefined) {
		if (typeof req.query.status !== 'string' || !STATUSES.has(req.query.status)) {
			addDetail(details, 'status', 'INVALID_ENUM', 'status has an unsupported value');
		} else status = req.query.status;
	}
	const page = positiveInteger(req.query.page, 'page', 1, 2147483647, details);
	const pageSize = positiveInteger(req.query.pageSize, 'pageSize', 20, 100, details);
	if (details.length) return fail(details, next);
	req.supportQuery = { status, page, pageSize };
	return next();
}

function validateRequestId(req, res, next) {
	const value = req.params.requestId;
	if (!/^[1-9]\d*$/.test(value) || Number(value) > Number.MAX_SAFE_INTEGER) {
		return fail([{ field: 'requestId', code: 'OUT_OF_RANGE', message: 'requestId must be a positive integer' }], next);
	}
	req.supportRequestId = Number(value);
	return next();
}

function normalizedString(body, field, maximum, details) {
	const value = body[field];
	if (typeof value !== 'string') {
		addDetail(details, field, 'INVALID_TYPE', `${field} must be a string`);
		return undefined;
	}
	const normalized = value.trim();
	if (!normalized) addDetail(details, field, 'REQUIRED', `${field} must not be blank`);
	else if (normalized.length > maximum) addDetail(details, field, 'TOO_LONG', `${field} must not exceed ${maximum} characters`);
	return normalized;
}

function rejectUnknown(body, allowed, details) {
	for (const field of Object.keys(body)) {
		if (!allowed.has(field)) addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
	}
}

function validateCreateRequest(req, res, next) {
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
	const details = [];
	rejectUnknown(body, new Set(['subject', 'message', 'category']), details);
	const subject = normalizedString(body, 'subject', 200, details);
	const message = normalizedString(body, 'message', 5000, details);
	let category = body.category ?? 'question';
	if (typeof category !== 'string' || !CATEGORIES.has(category)) {
		addDetail(details, 'category', 'INVALID_ENUM', 'category has an unsupported value');
		category = 'question';
	}
	if (details.length) return fail(details, next);
	req.supportBody = { subject, message, category };
	return next();
}

function validateMessage(req, res, next) {
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
	const details = [];
	rejectUnknown(body, new Set(['message']), details);
	const message = normalizedString(body, 'message', 5000, details);
	if (details.length) return fail(details, next);
	req.supportMessage = message;
	return next();
}

module.exports = {
	STATUSES,
	CATEGORIES,
	validateListQuery,
	validateRequestId,
	validateCreateRequest,
	validateMessage,
};
