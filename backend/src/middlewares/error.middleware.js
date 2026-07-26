const env = require('../config/env');

function errorMiddleware(err, req, res, next) {
	if (res.headersSent) {
		return next(err);
	}

	const status = Number.isInteger(err.status) ? err.status : 500;
	const isExpectedError = status >= 400 && status < 500;

	if (!isExpectedError && env.NODE_ENV !== 'production') {
		console.error(err);
	}

	res.status(status).json({
		success: false,
		message: isExpectedError ? err.message : 'Internal server error',
	});
}

module.exports = { errorMiddleware };
