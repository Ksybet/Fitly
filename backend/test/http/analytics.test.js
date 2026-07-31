jest.mock('../../src/modules/analytics/analytics.service', () => ({
	getActivityAnalytics: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const analyticsService =
	require('../../src/modules/analytics/analytics.service');

function authorization(userId = 2) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Activity analytics HTTP contract', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns the documented activity envelope', async () => {
		const data = {
			range: {
				period: 'month',
				from: '2026-07-01',
				to: '2026-07-31',
			},
			workouts: {
				workoutCount: 2,
				totalMinutes: 30,
				caloriesBurned: 250,
			},
			totalSteps: 5000,
			points: [],
		};
		analyticsService.getActivityAnalytics.mockResolvedValue(data);

		await request(app)
			.get('/api/v1/analytics/activity?period=month&endDate=2026-07-31')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual(data);
				expect(response.body.meta.requestId).toMatch(
					/^req_[0-9a-f]{32}$/,
				);
			});

		expect(analyticsService.getActivityAnalytics).toHaveBeenCalledWith(
			2,
			{ period: 'month', endDate: '2026-07-31' },
		);
	});

	test.each([
		['', 'period', 'REQUIRED'],
		['?period=quarter', 'period', 'INVALID_ENUM'],
		['?period=week&endDate=2026-02-30', 'endDate', 'INVALID_DATE'],
		['?period=week&extra=true', 'extra', 'UNKNOWN_FIELD'],
	])('rejects invalid query %s', async (query, field, code) => {
		await request(app)
			.get(`/api/v1/analytics/activity${query}`)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.code).toBe('VALIDATION_ERROR');
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ field, code }),
					]),
				);
			});
		expect(analyticsService.getActivityAnalytics).not.toHaveBeenCalled();
	});

	test('requires authentication', async () => {
		await request(app)
			.get('/api/v1/analytics/activity?period=week')
			.expect(401);
		expect(analyticsService.getActivityAnalytics).not.toHaveBeenCalled();
	});
});
