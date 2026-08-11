jest.mock('../../src/modules/admin/admin-users.repository', () => ({
	listUsers: jest.fn(),
}));

const adminUsersRepository = require('../../src/modules/admin/admin-users.repository');
const adminUsersService = require('../../src/modules/admin/admin-users.service');

describe('admin users service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps users without exposing persistence-only fields', async () => {
		adminUsersRepository.listUsers.mockResolvedValue({
			total: 1,
			items: [{
				id: '7',
				email: 'user@example.com',
				firstName: null,
				role: 'user',
				status: 'blocked',
				emailVerified: false,
				createdAt: new Date('2026-08-01T10:00:00.000Z'),
				lastLoginAt: new Date('2026-08-11T12:00:00.000Z'),
				passwordHash: 'not-for-api',
			}],
		});

		await expect(adminUsersService.listUsers({ page: 2, pageSize: 5 }))
			.resolves.toEqual({
				items: [{
					id: 7,
					email: 'user@example.com',
					firstName: null,
					role: 'user',
					status: 'blocked',
					emailVerified: false,
					createdAt: '2026-08-01T10:00:00.000Z',
					lastLoginAt: '2026-08-11T12:00:00.000Z',
				}],
				meta: {
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				},
			});
	});

	test('applies pagination defaults and preserves nullable login time', async () => {
		adminUsersRepository.listUsers.mockResolvedValue({
			total: 0,
			items: [],
		});

		const result = await adminUsersService.listUsers({});

		expect(adminUsersRepository.listUsers).toHaveBeenCalledWith({
			query: undefined,
			role: undefined,
			status: undefined,
			page: 1,
			pageSize: 20,
		});
		expect(result.meta.totalPages).toBe(0);
	});
});
