const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../user/user.repository');
const { ApiError } = require('../../utils/api-error');
const { generateAccessToken } = require('../../utils/token');
const {
	recordAdminLoginAttempt,
} = require('../admin/admin-login-audit.service');

async function recordRejectedAdminLogin(user, failureReason, requestMetadata) {
	try {
		await recordAdminLoginAttempt({
			user,
			succeeded: false,
			failureReason,
			...requestMetadata,
		});
	} catch {
		console.error('Failed to persist rejected administrator login audit');
	}
}

async function loginUser({
	login,
	password,
	appVersion,
	ipAddress,
	device,
}) {
	if (!login || !password || !appVersion) {
		throw new ApiError(400, 'Поля login, password и appVersion обязательны');
	}

	const user = await findUserByEmail(login);
	const requestMetadata = { ipAddress, device, appVersion };

	if (!user) {
		throw new ApiError(401, 'Invalid credentials');
	}

	if (!user.isActive) {
		await recordRejectedAdminLogin(user, 'inactive_account', requestMetadata);
		throw new ApiError(403, 'User account is inactive');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		await recordRejectedAdminLogin(user, 'invalid_password', requestMetadata);
		throw new ApiError(401, 'Invalid credentials');
	}

	await recordAdminLoginAttempt({
		user,
		succeeded: true,
		...requestMetadata,
	});

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
	if (!email || !password || !appVersion) {
		throw new ApiError(400, 'Поля email, password и appVersion обязательны');
	}

	const existingUser = await findUserByEmail(email);

	if (existingUser) {
		throw new ApiError(409, 'User already exists');
	}

	const passwordHash = await bcrypt.hash(password, 10);

	const newUser = await createUser({
		email,
		passwordHash,
		role: 'user',
		isActive: true,
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
