const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const LOG_LEVELS = new Set(['info', 'warning', 'error', 'critical']);
const ALLOWED_FIELDS = new Set([
	'level',
	'service',
	'userId',
	'query',
	'from',
	'to',
	'page',
	'pageSize',
]);

function parsePositiveInteger(value, field, defaultValue, maximum, details) {
	if (value === undefined) return defaultValue;
	if (
		typeof value !== 'string'
		|| !/^[1-9]\d*$/.test(value)
		|| Number(value) > maximum
	) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be an integer between 1 and ${maximum}`,
		);
		return defaultValue;
	}
	return Number(value);
}

function parseOptionalString(value, field, maximum, details) {
	if (value === undefined) return undefined;
	if (typeof value !== 'string') {
		addDetail(details, field, 'INVALID_TYPE', `${field} must be a string`);
		return undefined;
	}
	if (value.length > maximum) {
		addDetail(
			details,
			field,
			'TOO_LONG',
			`${field} must not exceed ${maximum} characters`,
		);
		return undefined;
	}
	return value.trim() || undefined;
}

function parseDateTime(value, field, details) {
	if (value === undefined) return undefined;
	if (!isRfc3339DateTime(value)) {
		addDetail(
			details,
			field,
			'INVALID_DATE_TIME',
			`${field} must be an RFC3339 date-time with a timezone`,
		);
		return undefined;
	}
	return new Date(value);
}

function validateAdminLogsQuery(req, res, next) {
	const details = [];
	for (const field of Object.keys(req.query)) {
		if (!ALLOWED_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let level;
	if (req.query.level !== undefined) {
		if (typeof req.query.level !== 'string' || !LOG_LEVELS.has(req.query.level)) {
			addDetail(details, 'level', 'INVALID_ENUM', 'level has an unsupported value');
		} else {
			level = req.query.level;
		}
	}

	const service = parseOptionalString(req.query.service, 'service', 100, details);
	const query = parseOptionalString(req.query.query, 'query', 200, details);
	const userId = parsePositiveInteger(
		req.query.userId,
		'userId',
		undefined,
		2147483647,
		details,
	);
	const from = parseDateTime(req.query.from, 'from', details);
	const to = parseDateTime(req.query.to, 'to', details);
	const page = parsePositiveInteger(req.query.page, 'page', 1, 2147483647, details);
	const pageSize = parsePositiveInteger(req.query.pageSize, 'pageSize', 20, 100, details);

	if (from && to && from.getTime() > to.getTime()) {
		addDetail(details, 'to', 'INVALID_RANGE', 'to must be greater than or equal to from');
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.adminLogsQuery = {
		level,
		service,
		userId,
		query,
		from,
		to,
		page,
		pageSize,
	};
	return next();
}

module.exports = {
	LOG_LEVELS,
	validateAdminLogsQuery,
};
