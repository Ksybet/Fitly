const bcrypt = require('bcryptjs');
const {
	findUserByEmail,
	findUserById,
	createUser,
} = require('../user/user.repository');
const { ApiError } = require('../../utils/api-error');
const {
	generateAccessToken,
	getAccessTokenExpiresIn,
	generateRefreshToken,
	hashRefreshToken,
} = require('../../utils/token');
const {
	createSession,
	createLoginSession,
	rotateSession,
	revokeSession,
	revokeAllSessions,
} = require('./auth-session.repository');
const { toUserDto } = require('./auth.mapper');
const {
	recordAdminLoginAttempt,
} = require('../admin/admin-login-audit.service');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

function issueAccessToken(user, appVersion) {
	const accessToken = generateAccessToken({
		userId: user.id,
		email: user.email,
		role: user.role,
		...(appVersion === undefined ? {} : { appVersion }),
	});

	return {
		token: accessToken,
		tokenType: 'Bearer',
		expiresIn: getAccessTokenExpiresIn(accessToken),
	};
}

async function issueAuthData(user, appVersion) {
	const accessTokens = issueAccessToken(user, appVersion);
	const refreshToken = generateRefreshToken();

	await createSession({
		userId: user.id,
		refreshTokenHash: hashRefreshToken(refreshToken),
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
	});

	return {
		...accessTokens,
		refreshToken,
		user: toUserDto(user),
	};
}

async function issueLoginAuthData(user, appVersion) {
	const accessTokens = issueAccessToken(user, appVersion);
	const refreshToken = generateRefreshToken();
	const loginSession = await createLoginSession({
		userId: user.id,
		refreshTokenHash: hashRefreshToken(refreshToken),
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
		appVersion,
	});

	if (!loginSession) {
		throw new ApiError(401, 'Unauthorized');
	}

	return {
		...accessTokens,
		refreshToken,
		user: toUserDto({
			...user,
			appVersion: loginSession.appVersion ?? user.appVersion,
		}),
	};
}

async function refreshAuthTokens(refreshToken) {
	const nextRefreshToken = generateRefreshToken();
	const rotatedSession = await rotateSession({
		refreshTokenHash: hashRefreshToken(refreshToken),
		nextRefreshTokenHash: hashRefreshToken(nextRefreshToken),
		nextExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
	});

	if (!rotatedSession) {
		throw new ApiError(401, 'Invalid or expired refresh token');
	}

	const user = await findUserById(rotatedSession.userId);

	if (!user || !user.isActive) {
		throw new ApiError(401, 'Unauthorized');
	}

	return {
		...issueAccessToken(user, user.appVersion ?? undefined),
		refreshToken: nextRefreshToken,
	};
}

async function logoutSession(userId, refreshToken) {
	const revokedSession = await revokeSession({
		userId,
		refreshTokenHash: hashRefreshToken(refreshToken),
	});

	if (!revokedSession) {
		throw new ApiError(401, 'Invalid or expired refresh token');
	}
}

async function logoutAllSessions(userId) {
	await revokeAllSessions(userId);
}

async function loginUser({
	login,
	password,
	appVersion,
	ipAddress,
	device,
}) {
	const user = await findUserByEmail(login);
	const requestMetadata = { ipAddress, device, appVersion };

	if (!user) {
		throw new ApiError(401, 'Invalid credentials', {
			code: 'INVALID_CREDENTIALS',
		});
	}

	if (!user.isActive) {
		await recordRejectedAdminLogin(user, 'inactive_account', requestMetadata);
		throw new ApiError(401, 'Invalid credentials', {
			code: 'INVALID_CREDENTIALS',
		});
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		await recordRejectedAdminLogin(user, 'invalid_password', requestMetadata);
		throw new ApiError(401, 'Invalid credentials', {
			code: 'INVALID_CREDENTIALS',
		});
	}

	await recordAdminLoginAttempt({
		user,
		succeeded: true,
		...requestMetadata,
	});

	return issueLoginAuthData(user, appVersion);
}

async function registerUser({ email, password, appVersion }) {
	const normalizedEmail = email.trim().toLowerCase();
	const existingUser = await findUserByEmail(normalizedEmail);

	if (existingUser) {
		throw new ApiError(409, 'User already exists');
	}

	const passwordHash = await bcrypt.hash(password, 10);
	let newUser;

	try {
		newUser = await createUser({
			email: normalizedEmail,
			passwordHash,
			role: 'user',
			isActive: true,
			appVersion,
		});
	} catch (error) {
		if (error && error.code === '23505') {
			throw new ApiError(409, 'User already exists');
		}

		throw error;
	}

	return issueAuthData(newUser, appVersion);
}

async function getCurrentUser(userId) {
	const user = await findUserById(userId);

	if (!user || !user.isActive) {
		throw new ApiError(401, 'Unauthorized');
	}

	return toUserDto(user);
}

module.exports = {
	loginUser,
	registerUser,
	refreshAuthTokens,
	logoutSession,
	logoutAllSessions,
	getCurrentUser,
};
