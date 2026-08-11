const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

function isValidDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	return date.getUTCFullYear() === year
		&& date.getUTCMonth() === month - 1
		&& date.getUTCDate() === day;
}

function parsePositiveInteger(value, field, maximum, details, defaultValue) {
	if (value === undefined) {
		return defaultValue;
	}

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

function rejectInvalid(details, next) {
	if (details.length === 0) {
		return false;
	}

	next(new ApiError(400, 'Request validation failed', { details }));
	return true;
}

function validateDateRangeQuery(req, next, { paginated }) {
	const details = [];
	const allowedFields = new Set(
		paginated ? ['from', 'to', 'page', 'pageSize'] : ['from', 'to'],
	);

	for (const field of Object.keys(req.query)) {
		if (!allowedFields.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	const query = {};
	for (const field of ['from', 'to']) {
		if (req.query[field] === undefined) {
			continue;
		}

		if (!isValidDate(req.query[field])) {
			addDetail(
				details,
				field,
				'INVALID_DATE',
				`${field} must be a valid date in YYYY-MM-DD format`,
			);
		} else {
			query[field] = req.query[field];
		}
	}

	if (query.from && query.to && query.from > query.to) {
		addDetail(
			details,
			'to',
			'INVALID_RANGE',
			'to must be greater than or equal to from',
		);
	}

	if (paginated) {
		query.page = parsePositiveInteger(
			req.query.page,
			'page',
			2147483647,
			details,
			1,
		);
		query.pageSize = parsePositiveInteger(
			req.query.pageSize,
			'pageSize',
			100,
			details,
			20,
		);
	}

	if (rejectInvalid(details, next)) {
		return false;
	}

	req.healthQuery = query;
	return true;
}

function validateHistoryListQuery(req, res, next) {
	if (validateDateRangeQuery(req, next, { paginated: true })) {
		return next();
	}

	return undefined;
}

function validateDateRange(req, res, next) {
	if (validateDateRangeQuery(req, next, { paginated: false })) {
		return next();
	}

	return undefined;
}

function validateEntryId(req, res, next) {
	const value = req.params.entryId;
	const normalized = Number(value);

	if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(normalized)) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'entryId',
				code: 'OUT_OF_RANGE',
				message: 'entryId must be a positive safe integer',
			}],
		}));
	}

	req.healthEntryId = normalized;
	return next();
}

function validateDatePath(req, res, next) {
	if (!isValidDate(req.params.date)) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'date',
				code: 'INVALID_DATE',
				message: 'date must be a valid date in YYYY-MM-DD format',
			}],
		}));
	}

	req.healthDate = req.params.date;
	return next();
}

module.exports = {
	isValidDate,
	validateHistoryListQuery,
	validateDateRange,
	validateEntryId,
	validateDatePath,
};
