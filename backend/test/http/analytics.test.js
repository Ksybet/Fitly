jest.mock('../../src/modules/analytics/analytics.service', () => ({
	getAnalyticsSummary: jest.fn(),
	getWeightAnalytics: jest.fn(),
	getActivityAnalytics: jest.fn(),
	getSleepAnalytics: jest.fn(),
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

describe('Analytics HTTP contracts', () => {
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

	test.each(['week', 'month', 'year'])(
		'returns the documented %s summary envelope',
		async period => {
			const endDate = period === 'week' ? undefined : '2026-08-06';
			const query = new URLSearchParams({ period });
			if (endDate) {
				query.set('endDate', endDate);
			}
			const data = {
				range: {
					period,
					from: '2026-01-01',
					to: '2026-08-06',
				},
				latestWeightKg: 78.4,
				weightChangeKg: -1.2,
				bmi: 23.67,
				averageSleepMinutes: 452,
				averageSleepQuality: 4.2,
				totalWaterMl: 10500,
				averageDailyWaterMl: 1750,
				totalSteps: 42600,
				nutrition: {
					calories: 11750,
					proteinG: 615.4,
					fatG: 422.7,
					carbsG: 1380.2,
				},
				workouts: {
					workoutCount: 4,
					totalMinutes: 185,
					caloriesBurned: 1240,
				},
				averageMoodScore: 3.8,
			};
			analyticsService.getAnalyticsSummary.mockResolvedValue(data);

			await request(app)
				.get(`/api/v1/analytics/summary?${query}`)
				.set('Authorization', authorization())
				.expect(200)
				.expect(response => {
					expect(response.body.data).toEqual(data);
					expect(response.body.meta.requestId).toMatch(
						/^req_[0-9a-f]{32}$/,
					);
				});

			expect(analyticsService.getAnalyticsSummary).toHaveBeenCalledWith(
				2,
				{ period, endDate },
			);
		},
	);

	test.each([
		[
			'weight',
			'getWeightAnalytics',
			{
				range: {
					period: 'month',
					from: '2026-07-01',
					to: '2026-07-31',
				},
				currentWeightKg: 78.4,
				changeKg: -1.2,
				bmi: 23.67,
				points: [],
			},
		],
		[
			'sleep',
			'getSleepAnalytics',
			{
				range: {
					period: 'month',
					from: '2026-07-01',
					to: '2026-07-31',
				},
				averageDurationMinutes: 455,
				averageQuality: 4.2,
				points: [],
			},
		],
	])('returns the documented %s envelope', async (
		endpoint,
		serviceMethod,
		data,
	) => {
		analyticsService[serviceMethod].mockResolvedValue(data);

		await request(app)
			.get(`/api/v1/analytics/${endpoint}?period=month&endDate=2026-07-31`)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual(data);
				expect(response.body.meta.requestId).toMatch(
					/^req_[0-9a-f]{32}$/,
				);
			});

		expect(analyticsService[serviceMethod]).toHaveBeenCalledWith(
			2,
			{ period: 'month', endDate: '2026-07-31' },
		);
	});

	test.each([
		['summary', '', 'period', 'REQUIRED'],
		['summary', '?period=quarter', 'period', 'INVALID_ENUM'],
		['summary', '?period=week&endDate=2026-02-30', 'endDate', 'INVALID_DATE'],
		['summary', '?period=week&extra=true', 'extra', 'UNKNOWN_FIELD'],
		['weight', '', 'period', 'REQUIRED'],
		['activity', '?period=quarter', 'period', 'INVALID_ENUM'],
		['sleep', '?period=week&endDate=2026-02-30', 'endDate', 'INVALID_DATE'],
		['weight', '?period=week&extra=true', 'extra', 'UNKNOWN_FIELD'],
	])('rejects invalid %s query %s', async (endpoint, query, field, code) => {
		await request(app)
			.get(`/api/v1/analytics/${endpoint}${query}`)
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
		expect(analyticsService.getAnalyticsSummary).not.toHaveBeenCalled();
		expect(analyticsService.getWeightAnalytics).not.toHaveBeenCalled();
		expect(analyticsService.getActivityAnalytics).not.toHaveBeenCalled();
		expect(analyticsService.getSleepAnalytics).not.toHaveBeenCalled();
	});

	test.each(['summary', 'weight', 'activity', 'sleep'])(
		'requires authentication for %s analytics',
		async endpoint => {
			await request(app)
				.get(`/api/v1/analytics/${endpoint}?period=week`)
				.expect(401);
		},
	);
});
