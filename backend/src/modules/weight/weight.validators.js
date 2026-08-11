const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');
const { isValidDate } = require('../health/health.validators');

const WEIGHT_FIELDS = new Set(['date', 'weightKg']);

function validateWeightEntryRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: WEIGHT_FIELDS,
		requiredFields: ['date', 'weightKg'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'date')
			&& !isValidDate(body.date)
		) {
			addDetail(
				details,
				'date',
				'INVALID_DATE',
				'date must be a valid date in YYYY-MM-DD format',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'weightKg')
			&& (
				typeof body.weightKg !== 'number'
				|| !Number.isFinite(body.weightKg)
				|| body.weightKg < 20
				|| body.weightKg > 500
			)
		) {
			addDetail(
				details,
				'weightKg',
				'OUT_OF_RANGE',
				'weightKg must be a number between 20 and 500',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.weightBody = {
		date: body.date,
		weightKg: body.weightKg,
	};
	return next();
}

module.exports = { validateWeightEntryRequest };
