const { loginUser, registerUser } = require('./auth.service');

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

async function register(req, res, next) {
	try {
		const { email, password, appVersion } = req.body;

		const result = await registerUser({ email, password, appVersion });

		res.status(201).json({
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
				user: req.user,
			},
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	login,
	register,
	me,
};
