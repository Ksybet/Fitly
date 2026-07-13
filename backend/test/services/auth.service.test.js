jest.mock('../../src/modules/user/user.repository', () => ({
	findUserByEmail: jest.fn(),
	createUser: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('../../src/utils/token', () => ({ generateAccessToken: jest.fn() }));

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/modules/user/user.repository');
const { generateAccessToken } = require('../../src/utils/token');
const { loginUser, registerUser } = require('../../src/modules/auth/auth.service');

describe('auth service', () => {
	beforeEach(() => jest.clearAllMocks());

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
