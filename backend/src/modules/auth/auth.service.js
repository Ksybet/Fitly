const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../user/user.repository');
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

	let isPasswordValid = false;

	if (user.password_hash) {
		isPasswordValid = await bcrypt.compare(password, user.password_hash);
	} else {
		isPasswordValid = password === user.password;
	}

	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid credentials');
	}

	const accessToken = generateAccessToken({
		userId: user.id,
		email: user.email,
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

async function registerUser({ email, password, appVersion }) {
	const existingUser = await findUserByEmail(email);

	if (existingUser) {
		throw new ApiError(409, 'User already exists');
	}

	const password_hash = await bcrypt.hash(password, 10);

	const newUser = await createUser({
		email,
		password_hash,
		role: 'user',
	});



	const accessToken = generateAccessToken({
		userId: newUser.id,
		email: newUser.email,
		role: newUser.role,
		appVersion,
	});

	return {
		accessToken,
		user: {
			id: newUser.id,
			email: newUser.email,
			role: newUser.role,
		},
	};
}

module.exports = {
	loginUser,
	registerUser,
};
