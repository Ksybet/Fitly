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

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function achievementRow(overrides = {}) {
	return {
		id: 1,
		code: 'SQUATS_50',
		title: '50 приседаний',
		description: 'Выполните суммарно 50 приседаний.',
		rewardType: 'badge',
		imageUrl: null,
		conditionText: 'Выполнить 50 приседаний',
		targetValue: 50,
		sortOrder: 1,
		currentValue: '25',
		earnedAt: null,
		...overrides,
	};
}

describe('Achievements HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists filtered and paginated achievements', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [
				achievementRow(),
				achievementRow({
					id: 2,
					code: 'SQUATS_100',
					targetValue: 100,
					sortOrder: 2,
				}),
			],
		});

		await request(app)
			.get('/api/v1/achievements?status=in_progress&page=1&pageSize=1')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toEqual({
					success: true,
					data: [{
						id: 1,
						code: 'SQUATS_50',
						title: '50 приседаний',
						description: 'Выполните суммарно 50 приседаний.',
						rewardType: 'badge',
						imageUrl: null,
						conditionText: 'Выполнить 50 приседаний',
						status: 'in_progress',
						currentValue: 25,
						targetValue: 50,
						progressPercent: 50,
						earnedAt: null,
					}],
					meta: {
						page: 1,
						pageSize: 1,
						total: 2,
						totalPages: 2,
						requestId: expect.stringMatching(requestIdPattern),
					},
				});
			});

		expect(pool.query.mock.calls[0][1]).toEqual([7]);
		expect(pool.query.mock.calls[0][0]).toContain(
			"session.status = 'completed'",
		);
	});

	test('gets one earned achievement for the authenticated user', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [achievementRow({
				currentValue: '125',
				earnedAt: new Date('2026-08-01T10:00:00.000Z'),
			})],
		});

		await request(app)
			.get('/api/v1/achievements/1')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 1,
					status: 'earned',
					currentValue: 125,
					progressPercent: 100,
					earnedAt: '2026-08-01T10:00:00.000Z',
				});
			});

		expect(pool.query.mock.calls[0][1]).toEqual([7, 1]);
	});

	test.each([
		['/api/v1/achievements?status=unknown', 'status', 'INVALID_ENUM'],
		['/api/v1/achievements?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
		['/api/v1/achievements?unexpected=true', 'unexpected', 'UNKNOWN_FIELD'],
		['/api/v1/achievements/invalid', 'achievementId', 'OUT_OF_RANGE'],
	])('rejects an invalid request %s', async (path, field, code) => {
		await request(app)
			.get(path)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ field, code }),
					]),
				);
			});

		expect(pool.query).not.toHaveBeenCalled();
	});

	test('returns 404 for an unknown achievement', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/achievements/999')
			.set('Authorization', authorization())
			.expect(404);
	});

	test('requires a valid bearer token', async () => {
		await request(app).get('/api/v1/achievements').expect(401);
		await request(app)
			.get('/api/v1/achievements')
			.set('Authorization', 'Bearer invalid')
			.expect(401);

		expect(pool.query).not.toHaveBeenCalled();
	});
});
