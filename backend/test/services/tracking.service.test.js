jest.mock('../../src/modules/goals/goals.repository', () => ({
	getGoalsByUserId: jest.fn(),
	replaceGoals: jest.fn(),
}));
jest.mock('../../src/modules/water/water.repository', () => ({
	getTodayWater: jest.fn(),
	addWater: jest.fn(),
	resetTodayWater: jest.fn(),
}));
jest.mock('../../src/modules/sleep/sleep.repository', () => ({
	getTodaySleep: jest.fn(),
	upsertTodaySleep: jest.fn(),
}));
jest.mock('../../src/modules/mood/mood.repository', () => ({
	getTodayMood: jest.fn(),
	upsertTodayMood: jest.fn(),
}));
jest.mock('../../src/modules/daily/daily.repository', () => ({
	getToday: jest.fn(),
	upsertToday: jest.fn(),
}));

const goalsRepository = require('../../src/modules/goals/goals.repository');
const waterRepository = require('../../src/modules/water/water.repository');
const sleepRepository = require('../../src/modules/sleep/sleep.repository');
const moodRepository = require('../../src/modules/mood/mood.repository');
const dailyRepository = require('../../src/modules/daily/daily.repository');
const goalsService = require('../../src/modules/goals/goals.service');
const waterService = require('../../src/modules/water/water.service');
const sleepService = require('../../src/modules/sleep/sleep.service');
const moodService = require('../../src/modules/mood/mood.service');
const dailyService = require('../../src/modules/daily/daily.service');

describe('goals service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets goals with a normalized user id', async () => {
		const goals = [{ id: 1, title: 'Walk' }];
		goalsRepository.getGoalsByUserId.mockResolvedValueOnce(goals);

		await expect(goalsService.getGoals('7')).resolves.toBe(goals);
		expect(goalsRepository.getGoalsByUserId).toHaveBeenCalledWith(7);
	});

	test('rejects malformed goals and trims required values', async () => {
		await expect(goalsService.updateGoals(1, {})).rejects.toMatchObject({ status: 400 });
		await expect(goalsService.updateGoals(1, [{ goalType: 'steps', title: ' ' }]))
			.rejects.toMatchObject({ status: 400 });
		goalsRepository.replaceGoals.mockResolvedValueOnce([]);
		await goalsService.updateGoals(1, [{ goalType: ' steps ', title: ' Walk ', targetValue: '5000' }]);
		expect(goalsRepository.replaceGoals).toHaveBeenCalledWith(1, [{
			goalType: 'steps', title: 'Walk', targetValue: 5000,
		}]);
	});

	test('passes an empty list through as a deterministic replacement', async () => {
		goalsRepository.replaceGoals.mockResolvedValueOnce([]);
		await expect(goalsService.updateGoals(1, [])).resolves.toEqual([]);
		expect(goalsRepository.replaceGoals).toHaveBeenCalledWith(1, []);
	});
});

describe('water service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets and resets water with a normalized user id', async () => {
		waterRepository.getTodayWater.mockResolvedValueOnce({ totalMl: 250 });
		waterRepository.resetTodayWater.mockResolvedValueOnce({ totalMl: 0 });

		await expect(waterService.getTodayWater('7')).resolves.toEqual({ totalMl: 250 });
		await expect(waterService.resetTodayWater('7')).resolves.toEqual({ totalMl: 0 });
		expect(waterRepository.getTodayWater).toHaveBeenCalledWith(7);
		expect(waterRepository.resetTodayWater).toHaveBeenCalledWith(7);
	});

	test.each([-1, 0, '', 'not-a-number', Infinity])('rejects invalid water amount %p', async amount => {
		await expect(waterService.addWater(1, amount)).rejects.toMatchObject({ status: 400 });
	});

	test('normalizes a numeric string before calling the repository', async () => {
		waterRepository.addWater.mockResolvedValueOnce({ totalMl: 250 });
		await waterService.addWater(1, '250');
		expect(waterRepository.addWater).toHaveBeenCalledWith(1, 250);
	});

	test('rejects an invalid user id before accessing the repository', async () => {
		await expect(waterService.getTodayWater(0)).rejects.toMatchObject({ status: 400 });
		expect(waterRepository.getTodayWater).not.toHaveBeenCalled();
	});
});

describe('sleep service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets sleep with a normalized user id', async () => {
		const sleep = { sleepHours: 8, sleepMinutes: 15 };
		sleepRepository.getTodaySleep.mockResolvedValueOnce(sleep);

		await expect(sleepService.getTodaySleep('7')).resolves.toBe(sleep);
		expect(sleepRepository.getTodaySleep).toHaveBeenCalledWith(7);
	});

	test.each([
		[{ sleepEnd: '08:00', sleepHours: 8, sleepMinutes: 0 }],
		[{ sleepStart: '23:00', sleepHours: 8, sleepMinutes: 0 }],
		[{ sleepStart: '23:00', sleepEnd: '08:00', sleepHours: -1, sleepMinutes: 0 }],
		[{ sleepStart: '23:00', sleepEnd: '08:00', sleepHours: 8, sleepMinutes: 60 }],
		[{ sleepStart: '23:00', sleepEnd: '08:00', sleepHours: 'bad', sleepMinutes: 0 }],
	])('rejects invalid sleep data', async sleepData => {
		await expect(sleepService.updateTodaySleep(1, sleepData)).rejects.toMatchObject({ status: 400 });
	});

	test('stores valid duration and defaults missing quality', async () => {
		sleepRepository.upsertTodaySleep.mockResolvedValueOnce({ id: 1 });
		await sleepService.updateTodaySleep(1, {
			sleepStart: ' 23:00 ', sleepEnd: '08:00', sleepHours: '8', sleepMinutes: '15',
		});
		expect(sleepRepository.upsertTodaySleep).toHaveBeenCalledWith(1, {
			sleepStart: '23:00', sleepEnd: '08:00', sleepHours: 8, sleepMinutes: 15, sleepQuality: '',
		});
	});
});

describe('mood service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets mood with a normalized user id', async () => {
		const mood = { moodScore: 8, moodLabel: 'Calm' };
		moodRepository.getTodayMood.mockResolvedValueOnce(mood);

		await expect(moodService.getTodayMood('7')).resolves.toBe(mood);
		expect(moodRepository.getTodayMood).toHaveBeenCalledWith(7);
	});

	test.each([0, 11, 'bad'])('rejects an out-of-range mood score %p', async moodScore => {
		await expect(moodService.updateTodayMood(1, {
			moodScore, moodLabel: 'Happy', moodEmoji: '🙂',
		})).rejects.toMatchObject({ status: 400 });
	});

	test('requires label and emoji but accepts a null score', async () => {
		await expect(moodService.updateTodayMood(1, { moodScore: null, moodEmoji: '🙂' }))
			.rejects.toMatchObject({ status: 400 });
		await expect(moodService.updateTodayMood(1, { moodScore: null, moodLabel: 'Calm' }))
			.rejects.toMatchObject({ status: 400 });
		moodRepository.upsertTodayMood.mockResolvedValueOnce({ id: 1 });
		await moodService.updateTodayMood(1, {
			moodScore: null, moodLabel: ' Calm ', moodEmoji: ' 🙂 ', note: '',
		});
		expect(moodRepository.upsertTodayMood).toHaveBeenCalledWith(1, {
			moodScore: null, moodLabel: 'Calm', moodEmoji: '🙂', note: '',
		});
	});
});

describe('daily service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets daily tracking with a normalized user id', async () => {
		const daily = { steps: 4321, calories: 650 };
		dailyRepository.getToday.mockResolvedValueOnce(daily);

		await expect(dailyService.getToday('7')).resolves.toBe(daily);
		expect(dailyRepository.getToday).toHaveBeenCalledWith(7);
	});

	test.each([
		[{ steps: -1, calories: 0 }],
		[{ steps: 0, calories: -1 }],
		[{ steps: 'bad', calories: 0 }],
		[{ steps: 0, calories: Infinity }],
	])('rejects invalid daily values', async data => {
		await expect(dailyService.updateToday(1, data)).rejects.toMatchObject({ status: 400 });
	});

	test('preserves zero values and sends normalized integers to the repository', async () => {
		dailyRepository.upsertToday.mockResolvedValueOnce({ steps: 0, calories: 42 });
		await dailyService.updateToday(1, { steps: 0, calories: '42' });
		expect(dailyRepository.upsertToday).toHaveBeenCalledWith(1, { steps: 0, calories: 42 });
	});
});
