const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const WATER_FIELDS = new Set(['amountMl']);
const WATER_ENTRY_FIELDS = new Set(['amountMl', 'consumedAt']);

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

function validateWaterEntryRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: WATER_ENTRY_FIELDS,
		requiredFields: ['amountMl'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'amountMl')
			&& (
				!Number.isInteger(body.amountMl)
				|| body.amountMl < 1
				|| body.amountMl > 5000
			)
		) {
			addDetail(
				details,
				'amountMl',
				'OUT_OF_RANGE',
				'amountMl must be an integer between 1 and 5000',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'consumedAt')
			&& !isRfc3339DateTime(body.consumedAt)
		) {
			addDetail(
				details,
				'consumedAt',
				'INVALID_DATE_TIME',
				'consumedAt must be an RFC 3339 date-time',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.waterBody = {
		amountMl: body.amountMl,
		...(body.consumedAt !== undefined && { consumedAt: body.consumedAt }),
	};
	return next();
}

module.exports = {
	validateSetTodayWaterRequest,
	validateWaterEntryRequest,
};
