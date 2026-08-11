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

describe('Admin analytics HTTP contract', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the analytics overview', async (token, status) => {
		const adminRequest = request(app)
			.get('/api/v1/admin/analytics/overview?from=2026-08-01&to=2026-08-12');
		if (token) {
			adminRequest.set('Authorization', token);
		}

		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('returns user metrics for an inclusive UTC date range', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [{ registeredUsers: 12, activeUsers: 7 }],
		});

		await request(app)
			.get('/api/v1/admin/analytics/overview?from=2026-08-01&to=2026-08-12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					from: '2026-08-01',
					to: '2026-08-12',
					registeredUsers: { value: 12 },
					activeUsers: { value: 7 },
				});
				expect(response.body.data).not.toHaveProperty('premiumUsers');
				expect(response.body.data).not.toHaveProperty('popularFeatures');
			});

		expect(pool.query.mock.calls[0][1]).toEqual([
			'2026-08-01',
			'2026-08-12',
		]);
		expect(pool.query.mock.calls[0][0]).toContain("AT TIME ZONE 'UTC'");
		expect(pool.query.mock.calls[0][0]).toContain(
			'activity.activity_date BETWEEN $1::date AND $2::date',
		);
	});

	test.each([
		['to=2026-08-12', 'from'],
		['from=2026-08-01', 'to'],
		['from=2026-02-30&to=2026-08-12', 'from'],
		['from=2026-08-13&to=2026-08-12', 'to'],
		['from=2026-08-01&to=2026-08-12&unknown=true', 'unknown'],
	])('rejects invalid period %s', async (query, field) => {
		await request(app)
			.get(`/api/v1/admin/analytics/overview?${query}`)
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
