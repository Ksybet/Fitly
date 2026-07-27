const { ApiError } = require('../../utils/api-error');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_FIELDS = new Set([
	'email',
	'password',
	'passwordConfirmation',
	'appVersion',
]);
const LOGIN_FIELDS = new Set(['login', 'password', 'appVersion']);
const REFRESH_TOKEN_FIELDS = new Set(['refreshToken']);

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addDetail(details, field, code, message) {
	details.push({ field, code, message });
}

function validateBodyShape(body, allowedFields, details) {
	if (!isPlainObject(body)) {
		addDetail(details, 'body', 'INVALID_TYPE', 'Request body must be an object');
		return false;
	}

	for (const field of Object.keys(body)) {
		if (!allowedFields.has(field)) {
			addDetail(
				details,
				field,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	return true;
}

function validateEmail(value, field, details) {
	if (
		typeof value !== 'string'
		|| value.length > 254
		|| !EMAIL_PATTERN.test(value)
	) {
		addDetail(
			details,
			field,
			'INVALID_EMAIL',
			`${field} must be a valid email address`,
		);
	}
}

function validateAppVersion(value, details) {
	if (
		value !== undefined
		&& (typeof value !== 'string' || value.length > 30)
	) {
		addDetail(
			details,
			'appVersion',
			'INVALID_VALUE',
			'appVersion must be a string with at most 30 characters',
		);
	}
}

function rejectIfInvalid(details, next) {
	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

function validateLoginRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateBodyShape(body, LOGIN_FIELDS, details)) {
		if (!Object.prototype.hasOwnProperty.call(body, 'login')) {
			addDetail(details, 'login', 'REQUIRED', 'login is required');
		} else {
			validateEmail(body.login, 'login', details);
		}

		if (!Object.prototype.hasOwnProperty.call(body, 'password')) {
			addDetail(details, 'password', 'REQUIRED', 'password is required');
		} else if (
			typeof body.password !== 'string'
			|| body.password.length < 1
			|| body.password.length > 72
		) {
			addDetail(
				details,
				'password',
				'INVALID_LENGTH',
				'password must contain between 1 and 72 characters',
			);
		}

		validateAppVersion(body.appVersion, details);
	}

	return rejectIfInvalid(details, next);
}

function validateRegisterRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateBodyShape(body, REGISTER_FIELDS, details)) {
		if (!Object.prototype.hasOwnProperty.call(body, 'email')) {
			addDetail(details, 'email', 'REQUIRED', 'email is required');
		} else {
			validateEmail(body.email, 'email', details);
		}

		if (!Object.prototype.hasOwnProperty.call(body, 'password')) {
			addDetail(details, 'password', 'REQUIRED', 'password is required');
		} else if (
			typeof body.password !== 'string'
			|| body.password.length < 8
			|| body.password.length > 72
			|| !/[A-Z]/.test(body.password)
			|| !/[0-9]/.test(body.password)
			|| !/[^A-Za-z0-9]/.test(body.password)
		) {
			addDetail(
				details,
				'password',
				'WEAK_PASSWORD',
				'password must satisfy the documented strength requirements',
			);
		}

		if (
			Object.prototype.hasOwnProperty.call(body, 'passwordConfirmation')
			&& (
				typeof body.passwordConfirmation !== 'string'
				|| body.passwordConfirmation !== body.password
			)
		) {
			addDetail(
				details,
				'passwordConfirmation',
				'PASSWORD_MISMATCH',
				'passwordConfirmation must match password',
			);
		}

		validateAppVersion(body.appVersion, details);
	}

	return rejectIfInvalid(details, next);
}

function validateRefreshTokenRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateBodyShape(body, REFRESH_TOKEN_FIELDS, details)) {
		if (!Object.prototype.hasOwnProperty.call(body, 'refreshToken')) {
			addDetail(
				details,
				'refreshToken',
				'REQUIRED',
				'refreshToken is required',
			);
		} else if (
			typeof body.refreshToken !== 'string'
			|| body.refreshToken.length < 20
		) {
			addDetail(
				details,
				'refreshToken',
				'INVALID_LENGTH',
				'refreshToken must contain at least 20 characters',
			);
		}
	}

	return rejectIfInvalid(details, next);
}

module.exports = {
	validateLoginRequest,
	validateRegisterRequest,
	validateRefreshTokenRequest,
};
