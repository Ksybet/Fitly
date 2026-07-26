jest.mock('../../src/modules/admin/admin-login-audit.repository', () => ({
	createAdminLoginAttempt: jest.fn(),
}));

const {
	createAdminLoginAttempt,
} = require('../../src/modules/admin/admin-login-audit.repository');
const {
	recordAdminLoginAttempt,
} = require('../../src/modules/admin/admin-login-audit.service');

describe('administrator login audit service', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		null,
		{ id: 1, role: 'user' },
	])('does not persist attempts for a non-admin user', async user => {
		await expect(recordAdminLoginAttempt({
			user,
			succeeded: true,
		})).resolves.toBeNull();
		expect(createAdminLoginAttempt).not.toHaveBeenCalled();
	});

	test('normalizes and persists a successful administrator login', async () => {
		const administrator = {
			id: 7,
			email: 'admin@example.com',
			role: 'admin',
		};
		createAdminLoginAttempt.mockResolvedValue({ id: 1 });

		await expect(recordAdminLoginAttempt({
			user: administrator,
			succeeded: true,
			failureReason: 'must_be_removed',
			ipAddress: '203.0.113.10',
			device: `  ${'d'.repeat(520)}  `,
			appVersion: ` ${'1'.repeat(60)} `,
		})).resolves.toEqual({ id: 1 });

		expect(createAdminLoginAttempt).toHaveBeenCalledWith({
			userId: 7,
			email: 'admin@example.com',
			succeeded: true,
			failureReason: null,
			ipAddress: '203.0.113.10',
			device: 'd'.repeat(512),
			appVersion: '1'.repeat(50),
		});
	});

	test('uses safe defaults for rejected login metadata', async () => {
		const administrator = {
			id: 7,
			email: 'admin@example.com',
			role: 'admin',
		};

		await recordAdminLoginAttempt({
			user: administrator,
			succeeded: false,
			ipAddress: 'not-an-ip',
		});

		expect(createAdminLoginAttempt).toHaveBeenCalledWith({
			userId: 7,
			email: 'admin@example.com',
			succeeded: false,
			failureReason: 'authentication_failed',
			ipAddress: '0.0.0.0',
			device: 'unknown',
			appVersion: null,
		});
	});

	test('propagates persistence failures', async () => {
		const error = new Error('database unavailable');
		createAdminLoginAttempt.mockRejectedValue(error);

		await expect(recordAdminLoginAttempt({
			user: {
				id: 7,
				email: 'admin@example.com',
				role: 'admin',
			},
			succeeded: true,
		})).rejects.toBe(error);
	});
});
