const { ApiError } = require('../../utils/api-error');

function validateLoginRequest(req, res, next) {
	const { login, password, appVersion } = req.body || {};

	if (!login || !password || !appVersion) {
		return next(new ApiError(400, 'Поля login, password и appVersion обязательны'));
	}

	next();
}

function validateRegisterRequest(req, res, next) {
	const { email, password, appVersion } = req.body || {};

	if (!email || !password || !appVersion) {
		return next(new ApiError(400, 'Поля email, password и appVersion обязательны'));
	}

	if (password.length < 8) {
		return next(new ApiError(400, 'Пароль должен содержать минимум 8 символов'));
	}

	next();
}

module.exports = {
	validateLoginRequest,
	validateRegisterRequest,
};
