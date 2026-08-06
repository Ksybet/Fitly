const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const ACHIEVEMENT_STATUSES = new Set(['locked', 'in_progress', 'earned']);
const LIST_QUERY_FIELDS = new Set(['status', 'page', 'pageSize']);

function parsePositiveInteger(value, field, defaultValue, maximum, details) {
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

function validateAchievementsQuery(req, res, next) {
	const details = [];

	for (const field of Object.keys(req.query)) {
		if (!LIST_QUERY_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let status;
	if (req.query.status !== undefined) {
		if (
			typeof req.query.status !== 'string'
			|| !ACHIEVEMENT_STATUSES.has(req.query.status)
		) {
			addDetail(
				details,
				'status',
				'INVALID_ENUM',
				'status has an unsupported value',
			);
		} else {
			status = req.query.status;
		}
	}

	const page = parsePositiveInteger(
		req.query.page,
		'page',
		1,
		2147483647,
		details,
	);
	const pageSize = parsePositiveInteger(
		req.query.pageSize,
		'pageSize',
		20,
		100,
		details,
	);

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	req.achievementQuery = { status, page, pageSize };
	return next();
}

function validateAchievementId(req, res, next) {
	const value = req.params.achievementId;

	if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
		return next(new ApiError(400, 'Request validation failed', {
			details: [{
				field: 'achievementId',
				code: 'OUT_OF_RANGE',
				message: 'achievementId must be a positive integer',
			}],
		}));
	}

	req.achievementId = Number(value);
	return next();
}

module.exports = {
	ACHIEVEMENT_STATUSES,
	validateAchievementsQuery,
	validateAchievementId,
};
