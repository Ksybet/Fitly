const { verifyAccessToken } = require('../../utils/token');

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({
			success: false,
			message: 'Unauthorized',
		});
	}

	const token = authHeader.replace('Bearer ', '');

	try {
		const payload = verifyAccessToken(token);
		req.user = payload;
		next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: 'Invalid or expired token',
		});
	}
}

module.exports = { authMiddleware };
