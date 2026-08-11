const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
	isRfc3339DateTime,
} = require('../../utils/request-validation');

const DIARY_FIELDS = new Set([
	'recordedAt',
	'moodScore',
	'energyLevel',
	'stressLevel',
	'tags',
	'symptoms',
	'note',
]);

function rejectIfInvalid(details, next) {
	if (details.length > 0) {
		next(new ApiError(400, 'Request validation failed', { details }));
		return true;
	}

	return false;
}

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

function validateDiaryListQuery(req, res, next) {
	const details = [];
	const allowedFields = new Set(['from', 'to', 'moodScore', 'page', 'pageSize']);

	for (const field of Object.keys(req.query)) {
		if (!allowedFields.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let from;
	let to;
	for (const field of ['from', 'to']) {
		if (req.query[field] !== undefined) {
			if (!isValidDate(req.query[field])) {
				addDetail(
					details,
					field,
					'INVALID_DATE',
					`${field} must be a valid date in YYYY-MM-DD format`,
				);
			} else if (field === 'from') {
				from = req.query[field];
			} else {
				to = req.query[field];
			}
		}
	}

	if (from && to && from > to) {
		addDetail(
			details,
			'to',
			'INVALID_RANGE',
			'to must be greater than or equal to from',
		);
	}

	let moodScore;
	if (req.query.moodScore !== undefined) {
		moodScore = parsePositiveInteger(
			req.query.moodScore,
			'moodScore',
			5,
			details,
			undefined,
		);
	}

	const page = parsePositiveInteger(req.query.page, 'page', 2147483647, details, 1);
	const pageSize = parsePositiveInteger(req.query.pageSize, 'pageSize', 100, details, 20);
	const rejection = rejectIfInvalid(details, next);
	if (rejection) {
		return rejection;
	}

	req.diaryQuery = { from, to, moodScore, page, pageSize };
	return next();
}

function validateDiaryEntryId(req, res, next) {
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

	req.diaryEntryId = normalized;
	return next();
}

function validateScore(body, field, details, allowNull) {
	if (!Object.prototype.hasOwnProperty.call(body, field)) {
		return;
	}

	if (allowNull && body[field] === null) {
		return;
	}

	if (!Number.isInteger(body[field]) || body[field] < 1 || body[field] > 5) {
		addDetail(
			details,
			field,
			'OUT_OF_RANGE',
			`${field} must be an integer between 1 and 5${allowNull ? ' or null' : ''}`,
		);
	}
}

function validateStringArray(value, field, maximumLength, details) {
	if (!Array.isArray(value)) {
		addDetail(details, field, 'INVALID_TYPE', `${field} must be an array`);
		return [];
	}

	if (value.length > 20) {
		addDetail(
			details,
			field,
			'TOO_MANY_ITEMS',
			`${field} must contain at most 20 items`,
		);
	}

	const normalized = [];
	const seen = new Set();
	for (const [index, item] of value.entries()) {
		if (typeof item !== 'string') {
			addDetail(
				details,
				`${field}[${index}]`,
				'INVALID_TYPE',
				`${field} items must be strings`,
			);
			continue;
		}

		const trimmed = item.trim();
		const length = Array.from(trimmed).length;
		if (length < 1 || length > maximumLength) {
			addDetail(
				details,
				`${field}[${index}]`,
				'INVALID_LENGTH',
				`${field} items must contain between 1 and ${maximumLength} characters`,
			);
		}

		if (seen.has(trimmed)) {
			addDetail(
				details,
				`${field}[${index}]`,
				'DUPLICATE_ITEM',
				`${field} items must be unique after trimming`,
			);
		}

		seen.add(trimmed);
		normalized.push(trimmed);
	}

	return normalized;
}

function validateDiaryEntryRequest(req, next, update) {
	const details = [];
	const body = req.body;
	const requiredFields = update ? [] : ['recordedAt', 'moodScore'];
	const validBody = validateObjectBody(body, {
		allowedFields: DIARY_FIELDS,
		requiredFields,
		minProperties: update ? 1 : 0,
	}, details);
	const normalized = {};

	if (validBody) {
		if (Object.prototype.hasOwnProperty.call(body, 'recordedAt')) {
			if (!isRfc3339DateTime(body.recordedAt)) {
				addDetail(
					details,
					'recordedAt',
					'INVALID_DATE_TIME',
					'recordedAt must be a valid RFC 3339 date-time',
				);
			}
			normalized.recordedAt = body.recordedAt;
		}

		validateScore(body, 'moodScore', details, false);
		validateScore(body, 'energyLevel', details, update);
		validateScore(body, 'stressLevel', details, update);
		for (const field of ['moodScore', 'energyLevel', 'stressLevel']) {
			if (Object.prototype.hasOwnProperty.call(body, field)) {
				normalized[field] = body[field];
			}
		}

		if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
			normalized.tags = validateStringArray(body.tags, 'tags', 50, details);
		}
		if (Object.prototype.hasOwnProperty.call(body, 'symptoms')) {
			normalized.symptoms = validateStringArray(
				body.symptoms,
				'symptoms',
				100,
				details,
			);
		}

		if (Object.prototype.hasOwnProperty.call(body, 'note')) {
			if (body.note === null && update) {
				normalized.note = null;
			} else if (
				typeof body.note !== 'string'
				|| Array.from(body.note).length > 5000
			) {
				addDetail(
					details,
					'note',
					'INVALID_LENGTH',
					'note must be a string with at most 5000 characters'
						+ (update ? ' or null' : ''),
				);
			} else {
				normalized.note = body.note;
			}
		}
	}

	const rejection = rejectIfInvalid(details, next);
	if (rejection) {
		return rejection;
	}

	if (!update) {
		normalized.energyLevel ??= null;
		normalized.stressLevel ??= null;
		normalized.tags ??= [];
		normalized.symptoms ??= [];
		normalized.note ??= null;
	}

	req.diaryBody = normalized;
	return next();
}

function validateCreateDiaryEntryRequest(req, res, next) {
	return validateDiaryEntryRequest(req, next, false);
}

function validateUpdateDiaryEntryRequest(req, res, next) {
	return validateDiaryEntryRequest(req, next, true);
}

module.exports = {
	isValidDate,
	validateDiaryListQuery,
	validateDiaryEntryId,
	validateCreateDiaryEntryRequest,
	validateUpdateDiaryEntryRequest,
	validateStringArray,
};
