function validateLoginRequest(req, res, next) {
	const { login, password, appVersion } = req.body;

	if (!login || !password || !appVersion) {
		return res.status(400).json({
			success: false,
			message: 'login, password and appVersion are required',
		});
	}

	if (
		typeof login !== 'string' ||
		typeof password !== 'string' ||
		typeof appVersion !== 'string'
	) {
		return res.status(400).json({
			success: false,
			message: 'Invalid request format',
		});
	}

	next();
}

module.exports = { validateLoginRequest };
