jest.mock('../../src/modules/user/user.repository', () => ({
	findUserByEmail: jest.fn(),
	findUserById: jest.fn(),
	createUser: jest.fn(),
}));
jest.mock('../../src/modules/auth/auth-session.repository', () => ({
	createSession: jest.fn(),
	createLoginSession: jest.fn(),
	rotateSession: jest.fn(),
	revokeSession: jest.fn(),
	revokeAllSessions: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('../../src/utils/token', () => ({
	generateAccessToken: jest.fn(),
	getAccessTokenExpiresIn: jest.fn(),
	generateRefreshToken: jest.fn(),
	hashRefreshToken: jest.fn(),
}));
jest.mock('../../src/modules/admin/admin-login-audit.service', () => ({
	recordAdminLoginAttempt: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/modules/user/user.repository');
const {
	createSession,
	createLoginSession,
	rotateSession,
	revokeSession,
	revokeAllSessions,
} = require('../../src/modules/auth/auth-session.repository');
const token = require('../../src/utils/token');
const {
	recordAdminLoginAttempt,
} = require('../../src/modules/admin/admin-login-audit.service');
const {
	loginUser,
	registerUser,
	refreshAuthTokens,
	logoutSession,
	logoutAllSessions,
	getCurrentUser,
} = require('../../src/modules/auth/auth.service');

const activeUser = {
	id: 7,
	email: 'user@example.com',
	role: 'user',
	isActive: true,
	emailVerified: false,
	appVersion: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	passwordHash: 'hash',
};

describe('auth service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		recordAdminLoginAttempt.mockResolvedValue(null);
		token.generateAccessToken.mockReturnValue('access-token');
		token.generateRefreshToken.mockReturnValue('refresh-token');
		token.hashRefreshToken.mockReturnValue('refresh-hash');
		token.getAccessTokenExpiresIn.mockReturnValue(3600);
		createSession.mockResolvedValue({ id: 1 });
		createLoginSession.mockResolvedValue({
			id: 2,
			appVersion: null,
			lastLoginAt: new Date('2026-08-12T12:00:00.000Z'),
		});
		rotateSession.mockResolvedValue({ id: 2, userId: 7 });
		revokeSession.mockResolvedValue({ id: 2 });
		revokeAllSessions.mockResolvedValue(2);
	});

	test('uses the same invalid-credentials response for missing, blocked, and mismatched users', async () => {
		userRepository.findUserByEmail.mockResolvedValueOnce(null);
		await expect(loginUser({
			login: 'user@example.com',
			password: 'wrong',
		})).rejects.toMatchObject({
			status: 401,
			code: 'INVALID_CREDENTIALS',
		});

		userRepository.findUserByEmail.mockResolvedValueOnce({
			...activeUser,
			isActive: false,
		});
		await expect(loginUser({
			login: activeUser.email,
			password: 'wrong',
		})).rejects.toMatchObject({
			status: 401,
			code: 'INVALID_CREDENTIALS',
		});

		userRepository.findUserByEmail.mockResolvedValueOnce(activeUser);
		bcrypt.compare.mockResolvedValueOnce(false);
		await expect(loginUser({
			login: activeUser.email,
			password: 'wrong',
		})).rejects.toMatchObject({
			status: 401,
			code: 'INVALID_CREDENTIALS',
		});
	});

	test('returns the documented token pair and persists only the refresh-token hash', async () => {
		userRepository.findUserByEmail.mockResolvedValue(activeUser);
		createLoginSession.mockResolvedValue({
			id: 2,
			appVersion: '1.2.3',
			lastLoginAt: new Date('2026-08-12T12:00:00.000Z'),
		});
		bcrypt.compare.mockResolvedValue(true);

		await expect(loginUser({
			login: activeUser.email,
			password: 'Strong#2026',
			appVersion: '1.2.3',
		})).resolves.toEqual({
			token: 'access-token',
			refreshToken: 'refresh-token',
			tokenType: 'Bearer',
			expiresIn: 3600,
			user: {
				id: 7,
				email: activeUser.email,
				role: 'user',
				status: 'active',
				emailVerified: false,
				appVersion: '1.2.3',
				createdAt: activeUser.createdAt,
			},
		});

		expect(token.generateAccessToken).toHaveBeenCalledWith({
			userId: 7,
			email: activeUser.email,
			role: 'user',
			appVersion: '1.2.3',
		});
		expect(createLoginSession).toHaveBeenCalledWith({
			userId: 7,
			refreshTokenHash: 'refresh-hash',
			expiresAt: expect.any(Date),
			appVersion: '1.2.3',
		});
		expect(createLoginSession.mock.calls[0][0])
			.not.toHaveProperty('refreshToken');
		expect(createSession).not.toHaveBeenCalled();
	});

	test('does not clear a stored app version when login omits the optional field', async () => {
		const user = { ...activeUser, appVersion: '1.0.0' };
		userRepository.findUserByEmail.mockResolvedValue(user);
		bcrypt.compare.mockResolvedValue(true);
		createLoginSession.mockResolvedValue({
			id: 2,
			appVersion: '1.0.0',
			lastLoginAt: new Date('2026-08-12T12:00:00.000Z'),
		});

		const result = await loginUser({
			login: user.email,
			password: 'Strong#2026',
		});

		expect(createLoginSession).toHaveBeenCalledWith(expect.objectContaining({
			userId: 7,
			appVersion: undefined,
		}));
		expect(token.generateAccessToken).toHaveBeenCalledWith({
			userId: 7,
			email: user.email,
			role: 'user',
		});
		expect(result.user.appVersion).toBe('1.0.0');
	});

	test('rotates a refresh token and returns only the documented token pair', async () => {
		const user = { ...activeUser, appVersion: '1.2.3' };
		userRepository.findUserById.mockResolvedValue(user);
		token.generateRefreshToken.mockReturnValue('next-refresh-token');
		token.hashRefreshToken
			.mockReturnValueOnce('current-refresh-hash')
			.mockReturnValueOnce('next-refresh-hash');

		const result = await refreshAuthTokens('current-refresh-token');

		expect(rotateSession).toHaveBeenCalledWith({
			refreshTokenHash: 'current-refresh-hash',
			nextRefreshTokenHash: 'next-refresh-hash',
			nextExpiresAt: expect.any(Date),
		});
		expect(token.generateAccessToken).toHaveBeenCalledWith({
			userId: 7,
			email: activeUser.email,
			role: 'user',
			appVersion: '1.2.3',
		});
		expect(result).toEqual({
			token: 'access-token',
			refreshToken: 'next-refresh-token',
			tokenType: 'Bearer',
			expiresIn: 3600,
		});
		expect(result).not.toHaveProperty('user');
	});

	test('rejects an invalid or already rotated refresh token', async () => {
		rotateSession.mockResolvedValueOnce(null);

		await expect(refreshAuthTokens('invalid-refresh-token'))
			.rejects.toMatchObject({
				status: 401,
				code: 'UNAUTHORIZED',
			});
		expect(userRepository.findUserById).not.toHaveBeenCalled();
	});

	test('logs out only the matching refresh session', async () => {
		token.hashRefreshToken.mockReturnValueOnce('current-refresh-hash');

		await expect(logoutSession(7, 'current-refresh-token'))
			.resolves.toBeUndefined();
		expect(revokeSession).toHaveBeenCalledWith({
			userId: 7,
			refreshTokenHash: 'current-refresh-hash',
		});

		revokeSession.mockResolvedValueOnce(null);
		await expect(logoutSession(7, 'different-refresh-token'))
			.rejects.toMatchObject({
				status: 401,
				code: 'UNAUTHORIZED',
			});
	});

	test('logs out all sessions for the authenticated user', async () => {
		await expect(logoutAllSessions(7)).resolves.toBeUndefined();
		expect(revokeAllSessions).toHaveBeenCalledWith(7);
	});

	test('keeps administrator audit behavior without exposing account state', async () => {
		const admin = {
			...activeUser,
			role: 'admin',
			isActive: false,
		};
		userRepository.findUserByEmail.mockResolvedValue(admin);

		await expect(loginUser({
			login: admin.email,
			password: 'wrong',
			appVersion: '1.2.3',
			ipAddress: '203.0.113.10',
			device: 'Fitly Test',
		})).rejects.toMatchObject({
			status: 401,
			code: 'INVALID_CREDENTIALS',
		});
		expect(recordAdminLoginAttempt).toHaveBeenCalledWith({
			user: admin,
			succeeded: false,
			failureReason: 'inactive_account',
			ipAddress: '203.0.113.10',
			device: 'Fitly Test',
			appVersion: '1.2.3',
		});
	});

	test('does not issue credentials when the successful administrator audit fails', async () => {
		const admin = { ...activeUser, role: 'admin' };
		userRepository.findUserByEmail.mockResolvedValue(admin);
		bcrypt.compare.mockResolvedValue(true);
		recordAdminLoginAttempt.mockRejectedValue(new Error('audit unavailable'));

		await expect(loginUser({
			login: admin.email,
			password: 'Strong#2026',
		})).rejects.toThrow('audit unavailable');
		expect(token.generateAccessToken).not.toHaveBeenCalled();
	});

	test('normalizes a registration email and returns the documented user DTO', async () => {
		userRepository.findUserByEmail.mockResolvedValueOnce({ id: 1 });
		await expect(registerUser({
			email: 'Existing@Example.com',
			password: 'Strong#2026',
		})).rejects.toMatchObject({ status: 409, code: 'STATE_CONFLICT' });

		userRepository.findUserByEmail.mockResolvedValueOnce(null);
		bcrypt.hash.mockResolvedValue('hashed-password');
		userRepository.createUser.mockResolvedValue({
			...activeUser,
			id: 9,
			email: 'new@example.com',
			appVersion: null,
		});

		const result = await registerUser({
			email: 'New@Example.com',
			password: 'Strong#2026',
		});

		expect(userRepository.findUserByEmail).toHaveBeenLastCalledWith('new@example.com');
		expect(userRepository.createUser).toHaveBeenCalledWith({
			email: 'new@example.com',
			passwordHash: 'hashed-password',
			role: 'user',
			isActive: true,
			appVersion: undefined,
		});
		expect(result).toMatchObject({
			token: 'access-token',
			refreshToken: 'refresh-token',
			user: {
				id: 9,
				email: 'new@example.com',
				status: 'active',
			},
		});
	});

	test('loads the current user from persistence instead of returning JWT claims', async () => {
		userRepository.findUserById.mockResolvedValue(activeUser);
		await expect(getCurrentUser(7)).resolves.toMatchObject({
			id: 7,
			email: activeUser.email,
			status: 'active',
		});

		userRepository.findUserById.mockResolvedValueOnce(null);
		await expect(getCurrentUser(7)).rejects.toMatchObject({ status: 401 });
	});
});
