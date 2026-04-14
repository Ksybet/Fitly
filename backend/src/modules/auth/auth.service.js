const { findUserByEmail } = require('../user/user.repository');
const { ApiError } = require('../../utils/api-error');
const { generateAccessToken } = require('../../utils/token');

async function loginUser({ login, password, appVersion }) {
	const user = await findUserByEmail(login);

	if (!user) {
		throw new ApiError(401, 'Invalid credentials');
	}

	if (!user.is_active) {
		throw new ApiError(403, 'User account is inactive');
	}

	if (password != user.password) {
		throw new ApiError(401, 'Invalid credentials');
	}

	const accessToken = generateAccessToken({
		userId: user.id,
		email: user.email,
		role: user.role,
		appVersion
	});

	return {
		accessToken,
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
		},
	};
	
}

module.exports = { loginUser };
