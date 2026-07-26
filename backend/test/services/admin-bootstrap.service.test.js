jest.mock('../../src/modules/user/user.repository', () => ({
	findUserByEmail: jest.fn(),
	createUser: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ hash: jest.fn() }));

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/modules/user/user.repository');
const {
	bootstrapAdministrator,
	validateAdminPassword,
} = require('../../src/modules/admin/admin-bootstrap.service');

describe('administrator bootstrap service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('is disabled when administrator settings are absent', async () => {
		await expect(bootstrapAdministrator({}))
			.resolves.toEqual({ status: 'disabled' });
		expect(userRepository.findUserByEmail).not.toHaveBeenCalled();
	});

	test('rejects incomplete or invalid administrator settings', async () => {
		await expect(bootstrapAdministrator({ password: 'Strong!Admin123' }))
			.rejects.toThrow('ADMIN_EMAIL is required');
		await expect(bootstrapAdministrator({ email: 'invalid-email' }))
			.rejects.toThrow('ADMIN_EMAIL must be a valid email address');

		userRepository.findUserByEmail.mockResolvedValueOnce(null);
		await expect(bootstrapAdministrator({ email: 'admin@example.com' }))
			.rejects.toThrow('ADMIN_PASSWORD is required');
	});

	test.each([
		'Short!1a',
		'NOLOWERCASE!123',
		'nouppercase!123',
		'NoDigitsHere!',
		'NoSpecial1234',
		'Has White space!123',
		`${'A'.repeat(126)}a1!`,
	])('rejects an invalid administrator password', password => {
		expect(() => validateAdminPassword(password))
			.toThrow('ADMIN_PASSWORD must be 12-128 characters');
	});

	test.each([
		'Strong!Admin123',
		`${'A'.repeat(8)}a1!b`,
		`${'A'.repeat(125)}a1!`,
	])('accepts a valid administrator password', password => {
		expect(() => validateAdminPassword(password)).not.toThrow();
	});

	test('does not change an existing administrator', async () => {
		userRepository.findUserByEmail.mockResolvedValue({
			id: 7,
			role: 'admin',
		});

		await expect(bootstrapAdministrator({
			email: ' ADMIN@Example.com ',
		})).resolves.toEqual({ status: 'existing', userId: 7 });

		expect(userRepository.findUserByEmail)
			.toHaveBeenCalledWith('admin@example.com');
		expect(bcrypt.hash).not.toHaveBeenCalled();
		expect(userRepository.createUser).not.toHaveBeenCalled();
	});

	test('rejects an email owned by a non-admin user', async () => {
		userRepository.findUserByEmail.mockResolvedValue({
			id: 8,
			role: 'user',
		});

		await expect(bootstrapAdministrator({
			email: 'user@example.com',
			password: 'Strong!Admin123',
		})).rejects.toThrow('ADMIN_EMAIL belongs to a non-admin user');

		expect(bcrypt.hash).not.toHaveBeenCalled();
		expect(userRepository.createUser).not.toHaveBeenCalled();
	});

	test('creates an active administrator with a strong password hash', async () => {
		userRepository.findUserByEmail.mockResolvedValue(null);
		bcrypt.hash.mockResolvedValue('hashed-password');
		userRepository.createUser.mockResolvedValue({ id: 9 });

		await expect(bootstrapAdministrator({
			email: 'ADMIN@Example.com',
			password: 'Strong!Admin123',
		})).resolves.toEqual({ status: 'created', userId: 9 });

		expect(bcrypt.hash).toHaveBeenCalledWith('Strong!Admin123', 12);
		expect(userRepository.createUser).toHaveBeenCalledWith({
			email: 'admin@example.com',
			passwordHash: 'hashed-password',
			role: 'admin',
			isActive: true,
		});
	});
});
