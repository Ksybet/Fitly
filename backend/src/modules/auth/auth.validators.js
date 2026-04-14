function validateLoginRequest(req, res, next) {
	const { login, password, appVersion } = req.body || {};

	if (!login || !password || !appVersion) {
		return res.status(400).json({
			success: false,
			message: 'Поля login, password и appVersion обязательны',
		});
	}

	next();
}

function validateRegisterRequest(req, res, next) {
	const { email, password, appVersion } = req.body || {};

	if (!email || !password || !appVersion) {
		return res.status(400).json({
			success: false,
			message: 'Поля email, password и appVersion обязательны',
		});
	}

	if (password.length < 8) {
		return res.status(400).json({
			success: false,
			message: 'Пароль должен содержать минимум 8 символов',
		});
	}

	next();
}

module.exports = {
	validateLoginRequest,
	validateRegisterRequest,
};
