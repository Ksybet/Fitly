const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');
const { STATUSES } = require('../support/support.validators');

const LIST_FIELDS = new Set(['status', 'query', 'page', 'pageSize']);

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
	let query;
	if (req.query.query !== undefined) {
		if (typeof req.query.query !== 'string') addDetail(details, 'query', 'INVALID_TYPE', 'query must be a string');
		else if (req.query.query.length > 100) addDetail(details, 'query', 'TOO_LONG', 'query must not exceed 100 characters');
		else query = req.query.query.trim() || undefined;
	}
	const page = positiveInteger(req.query.page, 'page', 1, 2147483647, details);
	const pageSize = positiveInteger(req.query.pageSize, 'pageSize', 20, 100, details);
	if (details.length) return fail(details, next);
	req.adminSupportQuery = { status, query, page, pageSize };
	return next();
}

function validateRequestId(req, res, next) {
	const value = req.params.requestId;
	if (!/^[1-9]\d*$/.test(value) || Number(value) > Number.MAX_SAFE_INTEGER) {
		return fail([{ field: 'requestId', code: 'OUT_OF_RANGE', message: 'requestId must be a positive integer' }], next);
	}
	req.adminSupportRequestId = Number(value);
	return next();
}

function validateStatus(req, res, next) {
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
	const details = [];
	if (typeof body.status !== 'string' || !STATUSES.has(body.status)) {
		addDetail(details, 'status', 'INVALID_ENUM', 'status has an unsupported value');
	}
	if (details.length) return fail(details, next);
	req.adminSupportStatus = body.status;
	return next();
}

function validateMessage(req, res, next) {
	const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
	const details = [];
	for (const field of Object.keys(body)) {
		if (field !== 'message') addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
	}
	if (typeof body.message !== 'string') addDetail(details, 'message', 'INVALID_TYPE', 'message must be a string');
	const message = typeof body.message === 'string' ? body.message.trim() : undefined;
	if (message !== undefined && !message) addDetail(details, 'message', 'REQUIRED', 'message must not be blank');
	else if (message?.length > 5000) addDetail(details, 'message', 'TOO_LONG', 'message must not exceed 5000 characters');
	if (details.length) return fail(details, next);
	req.adminSupportMessage = message;
	return next();
}

module.exports = { validateListQuery, validateRequestId, validateStatus, validateMessage };
