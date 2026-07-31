jest.mock('../../src/modules/analytics/analytics.repository', () => ({
	getDailyActivity: jest.fn(),
}));
jest.mock(
	'../../src/modules/settings/user-local-date.service',
	() => ({
		getDateInTimeZone: jest.fn(),
		getUserTimezone: jest.fn(),
	}),
);

const analyticsRepository =
	require('../../src/modules/analytics/analytics.repository');
const localDateService =
	require('../../src/modules/settings/user-local-date.service');
const analyticsService =
	require('../../src/modules/analytics/analytics.service');

describe('analytics service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localDateService.getUserTimezone.mockResolvedValue('Europe/Moscow');
		localDateService.getDateInTimeZone.mockReturnValue('2026-07-31');
	});

	test('aggregates saved workout data and daily points', async () => {
		analyticsRepository.getDailyActivity.mockResolvedValue([
			{
				date: '2026-07-01',
				steps: 1200,
				workoutCount: 1,
				elapsedSeconds: '59',
				caloriesBurned: 10.5,
			},
			{
				date: '2026-07-02',
				steps: 800,
				workoutCount: 1,
				elapsedSeconds: '61',
				caloriesBurned: 20,
			},
		]);

		await expect(analyticsService.getActivityAnalytics(7, {
			period: 'month',
			endDate: '2026-07-31',
		})).resolves.toEqual({
			range: {
				period: 'month',
				from: '2026-07-01',
				to: '2026-07-31',
			},
			workouts: {
				workoutCount: 2,
				totalMinutes: 2,
				caloriesBurned: 30.5,
			},
			totalSteps: 2000,
			points: [
				{ date: '2026-07-01', value: 1200, secondaryValue: 0 },
				{ date: '2026-07-02', value: 800, secondaryValue: 1 },
			],
		});
		expect(analyticsRepository.getDailyActivity).toHaveBeenCalledWith(
			7,
			{
				period: 'month',
				from: '2026-07-01',
				to: '2026-07-31',
			},
			'Europe/Moscow',
		);
	});

	test('uses the current date in the user timezone by default', async () => {
		analyticsRepository.getDailyActivity.mockResolvedValue([]);

		await analyticsService.getActivityAnalytics(7, { period: 'week' });

		expect(localDateService.getDateInTimeZone)
			.toHaveBeenCalledWith('Europe/Moscow');
		expect(analyticsRepository.getDailyActivity).toHaveBeenCalledWith(
			7,
			{
				period: 'week',
				from: '2026-07-27',
				to: '2026-07-31',
			},
			'Europe/Moscow',
		);
	});
});
