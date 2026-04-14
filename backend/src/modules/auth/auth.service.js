const { findUserByEmail } = require('../user/user.repository');
const { ApiError } = require('../../utils/api-error');

async function loginUser({ login, password, appVersion }) {
	const user = await findUserByEmail(login);

	if (!user) {
		throw new ApiError(401, 'Invalid credentials');
	}

	if (!user.is_active) {
		throw new ApiError(403, 'User account is inactive');
	}

	const isPasswordValid = password === user.password;

	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid credentials');
	}

	return {
		accessToken: 'test-token',
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
		},
	};
	
}

module.exports = { loginUser };
