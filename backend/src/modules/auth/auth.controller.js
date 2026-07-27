const {
	loginUser,
	registerUser,
	refreshAuthTokens,
	logoutSession,
	logoutAllSessions,
	getCurrentUser,
} = require('./auth.service');
const {
	sendSuccess,
	sendActionCompleted,
} = require('../../utils/http-response');

async function login(req, res, next) {
	try {
		const { login, password, appVersion } = req.body;

		const result = await loginUser({
			login,
			password,
			appVersion,
			ipAddress: req.ip,
			device: req.get('user-agent'),
		});

		return sendSuccess(res, result);
	} catch (error) {
		next(error);
	}
}

async function register(req, res, next) {
	try {
		const { email, password, appVersion } = req.body;

		const result = await registerUser({ email, password, appVersion });

		return sendSuccess(res, result, { status: 201 });
	} catch (error) {
		next(error);
	}
}

async function refresh(req, res, next) {
	try {
		const result = await refreshAuthTokens(req.body.refreshToken);

		return sendSuccess(res, result);
	} catch (error) {
		next(error);
	}
}

async function logout(req, res, next) {
	try {
		await logoutSession(req.user.userId, req.body.refreshToken);

		return sendActionCompleted(res);
	} catch (error) {
		next(error);
	}
}

async function logoutAll(req, res, next) {
	try {
		await logoutAllSessions(req.user.userId);

		return sendActionCompleted(res);
	} catch (error) {
		next(error);
	}
}

async function me(req, res, next) {
	try {
		const user = await getCurrentUser(req.user.userId);

		return sendSuccess(res, user);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	login,
	register,
	refresh,
	logout,
	logoutAll,
	me,
};
