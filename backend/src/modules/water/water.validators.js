const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const WATER_FIELDS = new Set(['amountMl']);

function validateSetTodayWaterRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: WATER_FIELDS,
		requiredFields: ['amountMl'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'amountMl')
			&& (
				!Number.isInteger(body.amountMl)
				|| body.amountMl < 0
				|| body.amountMl > 20000
			)
		) {
			addDetail(
				details,
				'amountMl',
				'OUT_OF_RANGE',
				'amountMl must be an integer between 0 and 20000',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = { validateSetTodayWaterRequest };
