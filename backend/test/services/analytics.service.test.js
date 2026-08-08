jest.mock('../../src/modules/analytics/analytics.repository', () => ({
	getWeightEntries: jest.fn(),
	getLatestWeight: jest.fn(),
	getProfileHeight: jest.fn(),
	getDailyActivity: jest.fn(),
	getSleepEntries: jest.fn(),
	getNutritionTotals: jest.fn(),
	getTotalWater: jest.fn(),
	getAverageMood: jest.fn(),
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

function mockSummaryData(overrides = {}) {
	const data = {
		weightRows: [],
		latestWeight: null,
		heightCm: null,
		activityRows: [],
		sleepRows: [],
		nutritionTotals: {
			calories: '0',
			proteinG: '0',
			fatG: '0',
			carbsG: '0',
		},
		totalWater: '0',
		averageMood: null,
		...overrides,
	};

	analyticsRepository.getWeightEntries.mockResolvedValue(data.weightRows);
	analyticsRepository.getLatestWeight.mockResolvedValue(data.latestWeight);
	analyticsRepository.getProfileHeight.mockResolvedValue(data.heightCm);
	analyticsRepository.getDailyActivity.mockResolvedValue(data.activityRows);
	analyticsRepository.getSleepEntries.mockResolvedValue(data.sleepRows);
	analyticsRepository.getNutritionTotals
		.mockResolvedValue(data.nutritionTotals);
	analyticsRepository.getTotalWater.mockResolvedValue(data.totalWater);
	analyticsRepository.getAverageMood.mockResolvedValue(data.averageMood);
}

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
				{
					date: '2026-07-01',
					steps: 1200,
					workoutMinutes: 0,
					caloriesBurned: 10.5,
				},
				{
					date: '2026-07-02',
					steps: 800,
					workoutMinutes: 1,
					caloriesBurned: 20,
				},
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

	test('builds weight analytics and calculates BMI and change', async () => {
		analyticsRepository.getWeightEntries.mockResolvedValue([
			{ date: '2026-07-01', weightKg: 79.6 },
			{ date: '2026-07-31', weightKg: 78.4 },
		]);
		analyticsRepository.getLatestWeight.mockResolvedValue(78.4);
		analyticsRepository.getProfileHeight.mockResolvedValue(182);

		await expect(analyticsService.getWeightAnalytics(7, {
			period: 'month',
			endDate: '2026-07-31',
		})).resolves.toEqual({
			range: {
				period: 'month',
				from: '2026-07-01',
				to: '2026-07-31',
			},
			currentWeightKg: 78.4,
			changeKg: -1.2,
			bmi: 23.67,
			points: [
				{ date: '2026-07-01', value: 79.6 },
				{ date: '2026-07-31', value: 78.4 },
			],
		});
		expect(analyticsRepository.getLatestWeight)
			.toHaveBeenCalledWith(7, '2026-07-31');
	});

	test('returns no weight change for a single period entry', async () => {
		analyticsRepository.getWeightEntries.mockResolvedValue([
			{ date: '2026-07-31', weightKg: 70 },
		]);
		analyticsRepository.getLatestWeight.mockResolvedValue(70);
		analyticsRepository.getProfileHeight.mockResolvedValue(170);

		const result = await analyticsService.getWeightAnalytics(7, {
			period: 'week',
			endDate: '2026-07-31',
		});

		expect(result.changeKg).toBeNull();
	});

	test.each([
		[null, 180],
		[70, null],
	])('returns null BMI for weight %p and height %p', async (
		latestWeight,
		heightCm,
	) => {
		analyticsRepository.getWeightEntries.mockResolvedValue([]);
		analyticsRepository.getLatestWeight.mockResolvedValue(latestWeight);
		analyticsRepository.getProfileHeight.mockResolvedValue(heightCm);

		const result = await analyticsService.getWeightAnalytics(7, {
			period: 'week',
			endDate: '2026-07-31',
		});

		expect(result.bmi).toBeNull();
	});

	test('returns nullable sleep averages for an empty period', async () => {
		analyticsRepository.getSleepEntries.mockResolvedValue([]);

		await expect(analyticsService.getSleepAnalytics(7, {
			period: 'week',
			endDate: '2026-07-31',
		})).resolves.toEqual({
			range: {
				period: 'week',
				from: '2026-07-27',
				to: '2026-07-31',
			},
			averageDurationMinutes: null,
			averageQuality: null,
			points: [],
		});
	});

	test('rounds sleep points and averages to the documented precision', async () => {
		analyticsRepository.getSleepEntries.mockResolvedValue([
			{ date: '2026-07-29', durationMinutes: 470.4, quality: 4 },
			{ date: '2026-07-30', durationMinutes: 439.4, quality: 4 },
			{ date: '2026-07-31', durationMinutes: 455.2, quality: 5 },
		]);

		await expect(analyticsService.getSleepAnalytics(7, {
			period: 'week',
			endDate: '2026-07-31',
		})).resolves.toEqual({
			range: {
				period: 'week',
				from: '2026-07-27',
				to: '2026-07-31',
			},
			averageDurationMinutes: 455,
			averageQuality: 4.3,
			points: [
				{ date: '2026-07-29', value: 470, secondaryValue: 4 },
				{ date: '2026-07-30', value: 439, secondaryValue: 4 },
				{ date: '2026-07-31', value: 455, secondaryValue: 5 },
			],
		});
	});

	test('builds a complete summary and applies documented rounding', async () => {
		mockSummaryData({
			weightRows: [
				{ date: '2026-08-01', weightKg: 79.6 },
				{ date: '2026-08-06', weightKg: 78.4 },
			],
			latestWeight: 78.4,
			heightCm: 182,
			activityRows: [
				{
					date: '2026-08-01',
					steps: 1200,
					workoutCount: 1,
					elapsedSeconds: '119',
					caloriesBurned: '10.5',
				},
				{
					date: '2026-08-02',
					steps: 800,
					workoutCount: 1,
					elapsedSeconds: '61',
					caloriesBurned: '20',
				},
			],
			sleepRows: [
				{ date: '2026-08-01', durationMinutes: 450.5, quality: 4 },
				{ date: '2026-08-02', durationMinutes: 452.5, quality: 4.3 },
			],
			nutritionTotals: {
				calories: '11750.005',
				proteinG: '615.444',
				fatG: '422.675',
				carbsG: '1380.2',
			},
			totalWater: '10001',
			averageMood: '3.85',
		});

		await expect(analyticsService.getAnalyticsSummary(7, {
			period: 'month',
			endDate: '2026-08-06',
		})).resolves.toEqual({
			range: {
				period: 'month',
				from: '2026-08-01',
				to: '2026-08-06',
			},
			latestWeightKg: 78.4,
			weightChangeKg: -1.2,
			bmi: 23.67,
			averageSleepMinutes: 452,
			averageSleepQuality: 4.2,
			totalWaterMl: 10001,
			averageDailyWaterMl: 1667,
			totalSteps: 2000,
			nutrition: {
				calories: 11750.01,
				proteinG: 615.44,
				fatG: 422.68,
				carbsG: 1380.2,
			},
			workouts: {
				workoutCount: 2,
				totalMinutes: 3,
				caloriesBurned: 30.5,
			},
			averageMoodScore: 3.9,
		});
		expect(analyticsRepository.getNutritionTotals).toHaveBeenCalledWith(
			7,
			{
				period: 'month',
				from: '2026-08-01',
				to: '2026-08-06',
			},
			'Europe/Moscow',
		);
	});

	test('returns null and zero summary values for an empty period', async () => {
		mockSummaryData();

		await expect(analyticsService.getAnalyticsSummary(7, {
			period: 'week',
			endDate: '2026-08-06',
		})).resolves.toEqual({
			range: {
				period: 'week',
				from: '2026-08-03',
				to: '2026-08-06',
			},
			latestWeightKg: null,
			weightChangeKg: null,
			bmi: null,
			averageSleepMinutes: null,
			averageSleepQuality: null,
			totalWaterMl: 0,
			averageDailyWaterMl: 0,
			totalSteps: 0,
			nutrition: {
				calories: 0,
				proteinG: 0,
				fatG: 0,
				carbsG: 0,
			},
			workouts: {
				workoutCount: 0,
				totalMinutes: 0,
				caloriesBurned: 0,
			},
			averageMoodScore: null,
		});
	});

	test('keeps weight change and BMI nullable for one entry without height', async () => {
		mockSummaryData({
			weightRows: [{ date: '2026-08-06', weightKg: 78.4 }],
			latestWeight: 78.4,
		});

		const result = await analyticsService.getAnalyticsSummary(7, {
			period: 'week',
			endDate: '2026-08-06',
		});

		expect(result).toMatchObject({
			latestWeightKg: 78.4,
			weightChangeKg: null,
			bmi: null,
		});
	});

	test('starts independent summary repository reads in parallel', async () => {
		mockSummaryData();
		let resolveWeightRows;
		analyticsRepository.getWeightEntries.mockReturnValue(
			new Promise(resolve => {
				resolveWeightRows = resolve;
			}),
		);

		const summaryPromise = analyticsService.getAnalyticsSummary(7, {
			period: 'week',
			endDate: '2026-08-06',
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(analyticsRepository.getLatestWeight).toHaveBeenCalled();
		expect(analyticsRepository.getDailyActivity).toHaveBeenCalled();
		expect(analyticsRepository.getNutritionTotals).toHaveBeenCalled();
		expect(analyticsRepository.getAverageMood).toHaveBeenCalled();

		resolveWeightRows([]);
		await expect(summaryPromise).resolves.toBeDefined();
	});
});
