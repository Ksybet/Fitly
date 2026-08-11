jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

function authorization(role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId: 7, role },
		process.env.JWT_SECRET,
	)}`;
}

function adminUserRow(overrides = {}) {
	return {
		id: 10,
		email: 'member@example.com',
		firstName: 'Member',
		role: 'user',
		status: 'blocked',
		emailVerified: true,
		createdAt: new Date('2026-08-10T10:00:00.000Z'),
		lastLoginAt: null,
		...overrides,
	};
}

describe('Admin users HTTP contract', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the user list', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/users');
		if (token) {
			adminRequest.set('Authorization', token);
		}

		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('lists users with search, role, status and pagination filters', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [adminUserRow()] });

		await request(app)
			.get('/api/v1/admin/users?query=MEMBER&role=user&status=blocked&page=2&pageSize=5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([{
					id: 10,
					email: 'member@example.com',
					firstName: 'Member',
					role: 'user',
					status: 'blocked',
					emailVerified: true,
					createdAt: '2026-08-10T10:00:00.000Z',
					lastLoginAt: null,
				}]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				});
				expect(response.body.data[0]).not.toHaveProperty('passwordHash');
				expect(response.body.data[0]).not.toHaveProperty('subscriptionStatus');
			});

		expect(pool.query.mock.calls[0][1]).toEqual([
			'%MEMBER%',
			'user',
			false,
		]);
		expect(pool.query.mock.calls[1][1]).toEqual([
			'%MEMBER%',
			'user',
			false,
			5,
			5,
		]);
		expect(pool.query.mock.calls[1][0])
			.toContain('ORDER BY u.created_at DESC, u.id DESC');
	});

	test.each([
		['status=deleted', 'status'],
		['role=operator', 'role'],
		['page=0', 'page'],
		['pageSize=101', 'pageSize'],
		['unknown=true', 'unknown'],
	])('rejects invalid query %s', async (query, field) => {
		await request(app)
			.get(`/api/v1/admin/users?${query}`)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});
});
