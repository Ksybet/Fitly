const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');
const { PERIODS } = require('./analytics-period');

const ANALYTICS_QUERY_FIELDS = new Set(['period', 'endDate']);

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

function validateAnalyticsPeriodQuery(req, res, next) {
	const details = [];

	for (const field of Object.keys(req.query)) {
		if (!ANALYTICS_QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	const period = req.query.period;
	if (period === undefined) {
		addDetail(details, 'period', 'REQUIRED', 'period is required');
	} else if (typeof period !== 'string' || !PERIODS.has(period)) {
		addDetail(
			details,
			'period',
			'INVALID_ENUM',
			'period has an unsupported value',
		);
	}

	let endDate;
	if (req.query.endDate !== undefined) {
		if (!isValidDate(req.query.endDate)) {
			addDetail(
				details,
				'endDate',
				'INVALID_DATE',
				'endDate must be a valid date in YYYY-MM-DD format',
			);
		} else {
			endDate = req.query.endDate;
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.analyticsPeriodQuery = { period, endDate };
	return next();
}

module.exports = {
	isValidDate,
	validateAnalyticsPeriodQuery,
};
