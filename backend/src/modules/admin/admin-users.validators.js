const { ApiError } = require('../../utils/api-error');
const { addDetail } = require('../../utils/request-validation');

const ALLOWED_FIELDS = new Set([
	'query',
	'role',
	'status',
	'page',
	'pageSize',
]);
const USER_ROLES = new Set(['user', 'admin']);
const ADMIN_USER_STATUSES = new Set(['active', 'blocked']);

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

function parseEnum(value, field, allowedValues, details) {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== 'string' || !allowedValues.has(value)) {
		addDetail(
			details,
			field,
			'INVALID_ENUM',
			`${field} has an unsupported value`,
		);
		return undefined;
	}

	return value;
}

function validateAdminUsersQuery(req, res, next) {
	const details = [];

	for (const field of Object.keys(req.query)) {
		if (!ALLOWED_FIELDS.has(field)) {
			addDetail(details, field, 'UNKNOWN_FIELD', `${field} is not allowed`);
		}
	}

	let query;
	if (req.query.query !== undefined) {
		if (typeof req.query.query !== 'string') {
			addDetail(details, 'query', 'INVALID_TYPE', 'query must be a string');
		} else if (req.query.query.length > 100) {
			addDetail(
				details,
				'query',
				'TOO_LONG',
				'query must not exceed 100 characters',
			);
		} else {
			query = req.query.query.trim() || undefined;
		}
	}

	const role = parseEnum(req.query.role, 'role', USER_ROLES, details);
	const status = parseEnum(
		req.query.status,
		'status',
		ADMIN_USER_STATUSES,
		details,
	);
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

	req.adminUsersQuery = { query, role, status, page, pageSize };
	return next();
}

module.exports = {
	USER_ROLES,
	ADMIN_USER_STATUSES,
	validateAdminUsersQuery,
};
