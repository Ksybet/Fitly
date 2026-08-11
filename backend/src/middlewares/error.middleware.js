const { ApiError, getDefaultErrorCode } = require('../utils/api-error');
const { createRequestId } = require('./request-context.middleware');
const logger = require('../modules/logging/logger');

function inferApiService(req) {
	const match = req.originalUrl?.match(/^\/api\/v1\/([^/?]+)/);
	return match ? `api.${match[1]}` : 'api.system';
}

function errorMiddleware(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	}

	const requestId = req.requestId || res.locals.requestId || createRequestId();
	const isMalformedJson =
		err instanceof SyntaxError &&
		err.status === 400 &&
		err.type === 'entity.parse.failed';
	const isApiError = err instanceof ApiError;
	const hasValidApiStatus =
		isApiError &&
		Number.isInteger(err.status) &&
		err.status >= 400 &&
		err.status <= 599;
	const status = isMalformedJson
		? 400
		: hasValidApiStatus
			? err.status
			: 500;
	const code = isMalformedJson
		? 'VALIDATION_ERROR'
		: hasValidApiStatus
			? err.code
			: getDefaultErrorCode(status);
	const message = isMalformedJson
		? 'Malformed JSON body'
		: hasValidApiStatus
			? err.message
			: 'Internal server error';
	const details = isMalformedJson
		? [{ message: 'Request body must contain valid JSON' }]
		: hasValidApiStatus
			? err.details
			: undefined;

	const error = {
		code,
		requestId,
	};

	if (Array.isArray(details) && details.length > 0) {
		error.details = details;
	}

	if (status >= 500) {
		void logger.error('HTTP request failed', {
			service: inferApiService(req),
			userId: req.user?.userId,
			requestId,
			error: err,
			method: req.method,
			path: req.originalUrl?.split('?')[0] || req.path,
			status,
			code,
		});
	}

	res.status(status).json({
		success: false,
		message,
		error,
	});
}

module.exports = { errorMiddleware, inferApiService };
