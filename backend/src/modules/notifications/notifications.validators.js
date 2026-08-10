const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const TYPES = new Set(['water', 'sleep', 'workout', 'achievement', 'system', 'support']);
const STATUSES = new Set(['created', 'scheduled', 'sent', 'read', 'cancelled']);
const QUERY_FIELDS = new Set(['status', 'type', 'page', 'pageSize']);

function parsePositiveInteger(value, field, defaultValue, maximum, details) {
	if (value === undefined) {
		return defaultValue;
	}
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > maximum) {
		addDetail(details, field, 'OUT_OF_RANGE', `${field} must be between 1 and ${maximum}`);
		return defaultValue;
	}
	return Number(value);
}

function validateNotificationQuery(req, res, next) {
	const details = [];
	for (const field of Object.keys(req.query)) {
		if (!QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let status;
	if (req.query.status !== undefined) {
		if (typeof req.query.status !== 'string' || !STATUSES.has(req.query.status)) {
			addDetail(details, 'status', 'INVALID_ENUM', 'status has an unsupported value');
		} else {
			status = req.query.status;
		}
	}

	let type;
	if (req.query.type !== undefined) {
		if (typeof req.query.type !== 'string' || !TYPES.has(req.query.type)) {
			addDetail(details, 'type', 'INVALID_ENUM', 'type has an unsupported value');
		} else {
			type = req.query.type;
		}
	}

	const page = parsePositiveInteger(req.query.page, 'page', 1, 2147483647, details);
	const pageSize = parsePositiveInteger(req.query.pageSize, 'pageSize', 20, 100, details);
	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.notificationQuery = { status, type, page, pageSize };
	return next();
}

function validateNotificationId(req, res, next) {
	const value = req.params.notificationId;
	if (!/^[1-9]\d*$/.test(value) || Number(value) > Number.MAX_SAFE_INTEGER) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'notificationId',
				code: 'OUT_OF_RANGE',
				message: 'notificationId must be a positive integer',
			}],
		}));
	}
	req.notificationId = Number(value);
	return next();
}

module.exports = {
	TYPES,
	STATUSES,
	validateNotificationQuery,
	validateNotificationId,
};
