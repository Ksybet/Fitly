const { loginUser } = require('./auth.service');

async function login(req, res, next) {
	try {
		const { login, password, appVersion } = req.body;

		const result = await loginUser({ login, password, appVersion });

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
}

async function me(req, res, next) {
	try {
		res.status(200).json({
			success: true,
			data: {
				user: req.user
			}
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	login,
	me
};
