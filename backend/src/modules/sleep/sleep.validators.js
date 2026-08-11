const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const SLEEP_FIELDS = new Set([
	'sleepStart',
	'sleepEnd',
	'sleepHours',
	'sleepMinutes',
	'sleepQuality',
]);
const SLEEP_ENTRY_FIELDS = new Set([
	'sleepStart',
	'sleepEnd',
	'sleepQuality',
]);

function validateSleepInteger(body, field, minimum, maximum, details) {
	if (
		Object.prototype.hasOwnProperty.call(body, field)
		&& (
			!Number.isInteger(body[field])
			|| body[field] < minimum
			|| body[field] > maximum
		)
	) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be an integer between ${minimum} and ${maximum}`,
		);
	}
}

function validateUpsertTodaySleepRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: SLEEP_FIELDS,
		requiredFields: ['sleepStart', 'sleepEnd', 'sleepQuality'],
	}, details)) {
		for (const field of ['sleepStart', 'sleepEnd']) {
			if (
				Object.prototype.hasOwnProperty.call(body, field)
				&& !isRfc3339DateTime(body[field])
			) {
				addDetail(
					details,
					field,
					'INVALID_DATE_TIME',
					`${field} must be an RFC 3339 date-time`,
				);
			}
		}

		validateSleepInteger(body, 'sleepHours', 0, 24, details);
		validateSleepInteger(body, 'sleepMinutes', 0, 59, details);
		validateSleepInteger(body, 'sleepQuality', 1, 5, details);
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

function validateSleepEntryRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: SLEEP_ENTRY_FIELDS,
		requiredFields: ['sleepStart', 'sleepEnd', 'sleepQuality'],
	}, details)) {
		for (const field of ['sleepStart', 'sleepEnd']) {
			if (
				Object.prototype.hasOwnProperty.call(body, field)
				&& !isRfc3339DateTime(body[field])
			) {
				addDetail(
					details,
					field,
					'INVALID_DATE_TIME',
					`${field} must be an RFC 3339 date-time`,
				);
			}
		}

		validateSleepInteger(body, 'sleepQuality', 1, 5, details);
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.sleepBody = {
		sleepStart: body.sleepStart,
		sleepEnd: body.sleepEnd,
		sleepQuality: body.sleepQuality,
	};
	return next();
}

module.exports = {
	validateUpsertTodaySleepRequest,
	validateSleepEntryRequest,
};
