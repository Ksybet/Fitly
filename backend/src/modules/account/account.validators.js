const { ApiError } = require('../../utils/api-error');

function validateDeleteAccountRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		details.push({
			field: 'body',
			code: 'INVALID_TYPE',
			message: 'Request body must be an object',
		});
	} else {
		for (const field of Object.keys(body)) {
			if (field !== 'password' && field !== 'confirmation') {
				details.push({
					field,
					code: 'UNKNOWN_FIELD',
					message: `${field} is not allowed`,
				});
			}
		}

		if (typeof body.password !== 'string' || body.password.length === 0) {
			details.push({
				field: 'password',
				code: 'REQUIRED',
				message: 'password is required',
			});
		}

		if (body.confirmation !== 'DELETE') {
			details.push({
				field: 'confirmation',
				code: 'INVALID_CONFIRMATION',
				message: 'confirmation must equal DELETE',
			});
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = { validateDeleteAccountRequest };
