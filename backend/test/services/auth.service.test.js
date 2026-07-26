jest.mock('../../src/modules/user/user.repository', () => ({
	findUserByEmail: jest.fn(),
	createUser: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('../../src/utils/token', () => ({ generateAccessToken: jest.fn() }));
jest.mock('../../src/modules/admin/admin-login-audit.service', () => ({
	recordAdminLoginAttempt: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/modules/user/user.repository');
const { generateAccessToken } = require('../../src/utils/token');
const {
	recordAdminLoginAttempt,
} = require('../../src/modules/admin/admin-login-audit.service');
const { loginUser, registerUser } = require('../../src/modules/auth/auth.service');

describe('auth service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		recordAdminLoginAttempt.mockResolvedValue(null);
	});

	test('rejects login with missing required fields', async () => {
		await expect(loginUser({ login: '', password: 'secret', appVersion: '1.0' }))
			.rejects.toMatchObject({ status: 400 });
	});

	test('rejects a missing or inactive user and an invalid password', async () => {
		userRepository.findUserByEmail.mockResolvedValueOnce(null);
		await expect(loginUser({ login: 'a@b.c', password: 'secret', appVersion: '1.0' }))
			.rejects.toMatchObject({ status: 401 });

		userRepository.findUserByEmail.mockResolvedValueOnce({ isActive: false });
		await expect(loginUser({ login: 'a@b.c', password: 'secret', appVersion: '1.0' }))
			.rejects.toMatchObject({ status: 403 });

		userRepository.findUserByEmail.mockResolvedValueOnce({
			id: 1, email: 'a@b.c', role: 'user', isActive: true, passwordHash: 'hash',
		});
		bcrypt.compare.mockResolvedValueOnce(false);
		await expect(loginUser({ login: 'a@b.c', password: 'secret', appVersion: '1.0' }))
			.rejects.toMatchObject({ status: 401 });
	});

	test('returns a safe successful login result and creates the expected JWT payload', async () => {
		const user = { id: 7, email: 'a@b.c', role: 'user', isActive: true, passwordHash: 'hash' };
		userRepository.findUserByEmail.mockResolvedValue(user);
		bcrypt.compare.mockResolvedValue(true);
		generateAccessToken.mockReturnValue('token');

		await expect(loginUser({ login: user.email, password: 'secret', appVersion: '1.2.3' }))
			.resolves.toEqual({ accessToken: 'token', user: { id: 7, email: user.email, role: 'user' } });
		expect(generateAccessToken).toHaveBeenCalledWith({
			userId: 7, email: user.email, role: 'user', appVersion: '1.2.3',
		});
		expect(recordAdminLoginAttempt).toHaveBeenCalledWith({
			user,
			succeeded: true,
			ipAddress: undefined,
			device: undefined,
			appVersion: '1.2.3',
		});
	});

	test('audits rejected administrator logins with request metadata', async () => {
		const inactiveAdmin = {
			id: 7,
			email: 'admin@example.com',
			role: 'admin',
			isActive: false,
		};
		userRepository.findUserByEmail.mockResolvedValueOnce(inactiveAdmin);

		await expect(loginUser({
			login: inactiveAdmin.email,
			password: 'secret',
			appVersion: '1.2.3',
			ipAddress: '203.0.113.10',
			device: 'Fitly Test',
		})).rejects.toMatchObject({ status: 403 });
		expect(recordAdminLoginAttempt).toHaveBeenLastCalledWith({
			user: inactiveAdmin,
			succeeded: false,
			failureReason: 'inactive_account',
			ipAddress: '203.0.113.10',
			device: 'Fitly Test',
			appVersion: '1.2.3',
		});

		const activeAdmin = {
			...inactiveAdmin,
			isActive: true,
			passwordHash: 'hash',
		};
		userRepository.findUserByEmail.mockResolvedValueOnce(activeAdmin);
		bcrypt.compare.mockResolvedValueOnce(false);

		await expect(loginUser({
			login: activeAdmin.email,
			password: 'wrong-password',
			appVersion: '1.2.3',
		})).rejects.toMatchObject({ status: 401 });
		expect(recordAdminLoginAttempt).toHaveBeenLastCalledWith({
			user: activeAdmin,
			succeeded: false,
			failureReason: 'invalid_password',
			ipAddress: undefined,
			device: undefined,
			appVersion: '1.2.3',
		});
	});

	test('does not issue a token when a successful administrator audit fails', async () => {
		const auditError = new Error('audit unavailable');
		const administrator = {
			id: 7,
			email: 'admin@example.com',
			role: 'admin',
			isActive: true,
			passwordHash: 'hash',
		};
		userRepository.findUserByEmail.mockResolvedValue(administrator);
		bcrypt.compare.mockResolvedValue(true);
		recordAdminLoginAttempt.mockRejectedValueOnce(auditError);

		await expect(loginUser({
			login: administrator.email,
			password: 'Strong!Admin123',
			appVersion: '1.2.3',
		})).rejects.toBe(auditError);
		expect(generateAccessToken).not.toHaveBeenCalled();
	});

	test('preserves an authentication rejection when its audit cannot be saved', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		const administrator = {
			id: 7,
			email: 'admin@example.com',
			role: 'admin',
			isActive: true,
			passwordHash: 'hash',
		};
		userRepository.findUserByEmail.mockResolvedValue(administrator);
		bcrypt.compare.mockResolvedValue(false);
		recordAdminLoginAttempt.mockRejectedValueOnce(new Error('audit unavailable'));

		await expect(loginUser({
			login: administrator.email,
			password: 'wrong-password',
			appVersion: '1.2.3',
		})).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
		expect(generateAccessToken).not.toHaveBeenCalled();
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to persist rejected administrator login audit',
		);
		consoleError.mockRestore();
	});

	test('rejects a duplicate email and registers a safe user with the user role', async () => {
		userRepository.findUserByEmail.mockResolvedValueOnce({ id: 1 });
		await expect(registerUser({ email: 'a@b.c', password: 'password', appVersion: '1.0' }))
			.rejects.toMatchObject({ status: 409 });

		userRepository.findUserByEmail.mockResolvedValueOnce(null);
		bcrypt.hash.mockResolvedValueOnce('hashed-password');
		userRepository.createUser.mockResolvedValueOnce({ id: 9, email: 'a@b.c', role: 'user', passwordHash: 'hidden' });
		generateAccessToken.mockReturnValueOnce('new-token');

		await expect(registerUser({ email: 'a@b.c', password: 'password', appVersion: '1.0' }))
			.resolves.toEqual({ accessToken: 'new-token', user: { id: 9, email: 'a@b.c', role: 'user' } });
		expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
		expect(userRepository.createUser).toHaveBeenCalledWith(expect.objectContaining({
			passwordHash: 'hashed-password', role: 'user', isActive: true,
		}));
	});
});
