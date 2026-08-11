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

function logRow(overrides = {}) {
	return {
		id: '10',
		timestamp: new Date('2026-08-12T10:00:00.000Z'),
		level: 'error',
		service: 'api.workout-sessions',
		userId: 42,
		message: 'Workout session failed',
		stackTrace: 'Error: database unavailable',
		requestId: 'req_example',
		metadata: { method: 'POST', status: 500 },
		...overrides,
	};
}

describe('Admin logs HTTP contract', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the technical log list', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/logs');
		if (token) adminRequest.set('Authorization', token);

		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('returns UTC log DTOs with all filters and pagination metadata', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [logRow()] });

		await request(app)
			.get(
				'/api/v1/admin/logs?level=error&service=api.workout-sessions'
				+ '&userId=42&query=database&from=2026-08-12T00:00:00Z'
				+ '&to=2026-08-12T23:59:59.999Z&page=2&pageSize=5',
			)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([{
					id: 10,
					timestamp: '2026-08-12T10:00:00.000Z',
					level: 'error',
					service: 'api.workout-sessions',
					userId: 42,
					message: 'Workout session failed',
					stackTrace: 'Error: database unavailable',
					requestId: 'req_example',
					metadata: { method: 'POST', status: 500 },
				}]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				});
			});

		expect(pool.query.mock.calls[0][1]).toEqual([
			'error',
			'api.workout-sessions',
			42,
			new Date('2026-08-12T00:00:00Z'),
			new Date('2026-08-12T23:59:59.999Z'),
			'%database%',
		]);
		expect(pool.query.mock.calls[1][1]).toEqual([
			'error',
			'api.workout-sessions',
			42,
			new Date('2026-08-12T00:00:00Z'),
			new Date('2026-08-12T23:59:59.999Z'),
			'%database%',
			5,
			5,
		]);
		expect(pool.query.mock.calls[1][0])
			.toContain('ORDER BY occurred_at DESC, id DESC');
	});

	test.each([
		['level=debug', 'level'],
		[`service=${'x'.repeat(101)}`, 'service'],
		['userId=0', 'userId'],
		[`query=${'x'.repeat(201)}`, 'query'],
		['from=2026-08-12', 'from'],
		['to=not-a-date', 'to'],
		['from=2026-08-13T00%3A00%3A00Z&to=2026-08-12T00%3A00%3A00Z', 'to'],
		['page=0', 'page'],
		['pageSize=101', 'pageSize'],
		['unknown=true', 'unknown'],
	])('rejects invalid query %s', async (query, field) => {
		await request(app)
			.get(`/api/v1/admin/logs?${query}`)
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
