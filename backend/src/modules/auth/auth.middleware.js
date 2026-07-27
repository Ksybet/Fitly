const { verifyAccessToken } = require('../../utils/token');
const { ApiError } = require('../../utils/api-error');

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return next(new ApiError(401, 'Unauthorized'));
	}

	const token = authHeader.replace('Bearer ', '');

	try {
		const payload = verifyAccessToken(token);

		if (
			!payload
			|| !Number.isInteger(payload.userId)
			|| payload.userId < 1
			|| !['user', 'admin'].includes(payload.role)
		) {
			throw new Error('Invalid access token claims');
		}

		req.user = payload;
		next();
	} catch (error) {
		return next(new ApiError(401, 'Invalid or expired token'));
	}
}

function requireRole(...allowedRoles) {
	return function roleMiddleware(req, res, next) {
		if (!req.user) {
			return next(new ApiError(401, 'Unauthorized'));
		}

		if (!allowedRoles.includes(req.user.role)) {
			return next(new ApiError(403, 'Forbidden'));
		}

		next();
	};
}

module.exports = {
	authMiddleware,
	requireRole,
};
