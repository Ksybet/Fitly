const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const ALLOWED_FIELDS = new Set(['from', 'to']);

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

function validateAdminAnalyticsQuery(req, res, next) {
	const details = [];
	const dates = {};

	for (const field of Object.keys(req.query)) {
		if (!ALLOWED_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	for (const field of ['from', 'to']) {
		if (req.query[field] === undefined) {
			addDetail(details, field, 'REQUIRED', `${field} is required`);
		} else if (!isValidDate(req.query[field])) {
			addDetail(
				details,
				field,
				'INVALID_DATE',
				`${field} must be a valid date in YYYY-MM-DD format`,
			);
		} else {
			dates[field] = req.query[field];
		}
	}

	if (dates.from && dates.to && dates.from > dates.to) {
		addDetail(
			details,
			'to',
			'INVALID_RANGE',
			'to must be greater than or equal to from',
		);
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.adminAnalyticsQuery = dates;
	return next();
}

module.exports = {
	isValidDate,
	validateAdminAnalyticsQuery,
};
