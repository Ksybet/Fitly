const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const DAILY_FIELDS = new Set(['steps', 'calories']);
const STEPS_FIELDS = new Set(['steps']);

function validateUpdateTodayRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: DAILY_FIELDS,
		minProperties: 1,
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'steps')
			&& (
				!Number.isInteger(body.steps)
				|| body.steps < 0
				|| body.steps > 200000
			)
		) {
			addDetail(
				details,
				'steps',
				'OUT_OF_RANGE',
				'steps must be an integer between 0 and 200000',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'calories')
			&& (
				typeof body.calories !== 'number'
				|| !Number.isFinite(body.calories)
				|| body.calories < 0
				|| body.calories > 20000
			)
		) {
			addDetail(
				details,
				'calories',
				'OUT_OF_RANGE',
				'calories must be a number between 0 and 20000',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

function validateStepsRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: STEPS_FIELDS,
		requiredFields: ['steps'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'steps')
			&& (
				!Number.isInteger(body.steps)
				|| body.steps < 0
				|| body.steps > 200000
			)
		) {
			addDetail(
				details,
				'steps',
				'OUT_OF_RANGE',
				'steps must be an integer between 0 and 200000',
			);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.stepsBody = { steps: body.steps };
	return next();
}

module.exports = {
	validateUpdateTodayRequest,
	validateStepsRequest,
};
