const DEFAULT_ERROR_CODES = Object.freeze({
	400: 'VALIDATION_ERROR',
	401: 'UNAUTHORIZED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
	409: 'STATE_CONFLICT',
	410: 'GONE',
	413: 'PAYLOAD_TOO_LARGE',
	429: 'RATE_LIMIT_EXCEEDED',
	503: 'SERVICE_UNAVAILABLE',
});

function getDefaultErrorCode(status) {
	return DEFAULT_ERROR_CODES[status] || 'INTERNAL_ERROR';
}

class ApiError extends Error {
	constructor(status, message, options = {}) {
		super(message, options.cause ? { cause: options.cause } : undefined);
		this.name = 'ApiError';
		this.status = status;
		this.code = options.code || getDefaultErrorCode(status);
		this.details = Array.isArray(options.details) ? options.details : undefined;
	}
}

module.exports = {
	ApiError,
	getDefaultErrorCode,
};
