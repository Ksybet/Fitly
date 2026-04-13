const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('../user/user.repository');
const { generateAccessToken } = require('../../utils/token');
const { ApiError } = require('../../utils/api-error');

async function loginUser({ login, password, appVersion }) {
	const user = await findUserByEmail(login);

	if (!user) {
		throw new ApiError(401, 'Invalid credentials');
	}

	if (!user.is_active) {
		throw new ApiError(403, 'User account is inactive');
	}

	const isPasswordValid = await bcrypt.compare(password, user.password_hash);
	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid credentials');
	}

	const accessToken = generateAccessToken({
		userId: user.id,
		role: user.role,
		appVersion,
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
