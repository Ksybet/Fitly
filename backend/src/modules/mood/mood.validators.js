const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const MOOD_FIELDS = new Set([
	'moodScore',
	'moodLabel',
	'moodEmoji',
	'note',
]);

function validateOptionalString(body, field, maximum, details) {
	if (
		Object.prototype.hasOwnProperty.call(body, field)
		&& (
			typeof body[field] !== 'string'
			|| Array.from(body[field]).length > maximum
		)
	) {
		addDetail(
			details,
			field,
			'INVALID_LENGTH',
			`${field} must be a string with at most ${maximum} characters`,
		);
	}
}

function validateUpsertTodayMoodRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: MOOD_FIELDS,
		requiredFields: ['moodScore'],
	}, details)) {
		if (
			Object.prototype.hasOwnProperty.call(body, 'moodScore')
			&& (
				!Number.isInteger(body.moodScore)
				|| body.moodScore < 1
				|| body.moodScore > 5
			)
		) {
			addDetail(
				details,
				'moodScore',
				'OUT_OF_RANGE',
				'moodScore must be an integer between 1 and 5',
			);
		}

		validateOptionalString(body, 'moodLabel', 50, details);
		validateOptionalString(body, 'moodEmoji', 16, details);
		validateOptionalString(body, 'note', 1000, details);
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = { validateUpsertTodayMoodRequest };
