jest.mock('../../src/modules/goals/goals.repository', () => ({
	getGoalsByUserId: jest.fn(),
	replaceGoals: jest.fn(),
}));
jest.mock('../../src/modules/water/water.repository', () => ({
	getTodayWater: jest.fn(),
	setTodayWater: jest.fn(),
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
		const createdAt = new Date('2026-07-26T12:00:00.000Z');
		const goals = [{
			id: 1,
			goalType: 'steps',
			title: 'Walk',
			targetValue: 5000,
			unit: 'steps',
			startsOn: '2026-07-26',
			endsOn: null,
			status: 'created',
			currentValue: null,
			progressPercent: 0,
			createdAt,
			completedAt: null,
		}];
		goalsRepository.getGoalsByUserId.mockResolvedValueOnce(goals);

		await expect(goalsService.getGoals('7')).resolves.toEqual([{
			...goals[0],
			createdAt: '2026-07-26T12:00:00.000Z',
		}]);
		expect(goalsRepository.getGoalsByUserId).toHaveBeenCalledWith(7);
	});

	test('passes replacements through without coercing contract values', async () => {
		const input = [{
			goalType: 'steps',
			title: 'Walk',
			targetValue: 5000,
			unit: 'steps',
		}];
		goalsRepository.replaceGoals.mockResolvedValueOnce([]);
		await expect(goalsService.updateGoals(1, input)).resolves.toEqual([]);
		expect(goalsRepository.replaceGoals).toHaveBeenCalledWith(1, input);
	});
});

describe('water service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets and replaces the singleton with a contract WaterDay DTO', async () => {
		const storedWater = {
			date: '2026-07-26',
			amountMl: 500,
			goalMl: 2000,
		};
		waterRepository.getTodayWater.mockResolvedValueOnce(storedWater);
		waterRepository.setTodayWater.mockResolvedValueOnce(storedWater);

		await expect(waterService.getTodayWater('7')).resolves.toEqual({
			...storedWater,
			progressPercent: 25,
		});
		await expect(waterService.setTodayWater('7', 500)).resolves.toEqual({
			...storedWater,
			progressPercent: 25,
		});
		expect(waterRepository.getTodayWater).toHaveBeenCalledWith(7);
		expect(waterRepository.setTodayWater).toHaveBeenCalledWith(7, 500);
	});

	test('rejects an invalid user id before accessing the repository', async () => {
		await expect(waterService.getTodayWater(0))
			.rejects.toMatchObject({ status: 400 });
		expect(waterRepository.getTodayWater).not.toHaveBeenCalled();
	});
});

describe('sleep service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps a persisted sleep record to the documented DTO', async () => {
		const sleep = {
			id: 1,
			date: '2026-07-26',
			sleepStart: new Date('2026-07-25T22:00:00.000Z'),
			sleepEnd: new Date('2026-07-26T06:00:00.000Z'),
			sleepQuality: 4,
			durationMinutes: 480,
			createdAt: new Date('2026-07-26T06:00:00.000Z'),
			updatedAt: new Date('2026-07-26T06:00:00.000Z'),
		};
		sleepRepository.getTodaySleep.mockResolvedValueOnce(sleep);

		await expect(sleepService.getTodaySleep('7')).resolves.toEqual({
			id: 1,
			date: '2026-07-26',
			sleepStart: '2026-07-25T22:00:00.000Z',
			sleepEnd: '2026-07-26T06:00:00.000Z',
			sleepQuality: 4,
			durationMinutes: 480,
			createdAt: '2026-07-26T06:00:00.000Z',
			updatedAt: '2026-07-26T06:00:00.000Z',
		});
	});

	test.each([
		['2026-07-26T08:00:00Z', '2026-07-26T08:00:00Z'],
		['2026-07-26T08:00:00Z', '2026-07-27T08:01:00Z'],
	])('rejects an invalid interval from %s to %s', async (sleepStart, sleepEnd) => {
		await expect(sleepService.updateTodaySleep(1, {
			sleepStart,
			sleepEnd,
			sleepQuality: 3,
		})).rejects.toMatchObject({ status: 400 });
	});

	test('persists timestamps and ignores deprecated duration hints', async () => {
		const storedSleep = {
			id: 1,
			date: '2026-07-26',
			sleepStart: '2026-07-25T22:00:00.000Z',
			sleepEnd: '2026-07-26T06:00:00.000Z',
			sleepQuality: 4,
			durationMinutes: 480,
			createdAt: '2026-07-26T06:00:00.000Z',
			updatedAt: '2026-07-26T06:00:00.000Z',
		};
		sleepRepository.upsertTodaySleep.mockResolvedValueOnce(storedSleep);

		await sleepService.updateTodaySleep(1, {
			sleepStart: storedSleep.sleepStart,
			sleepEnd: storedSleep.sleepEnd,
			sleepHours: 1,
			sleepMinutes: 2,
			sleepQuality: 4,
		});
		expect(sleepRepository.upsertTodaySleep).toHaveBeenCalledWith(1, {
			sleepStart: storedSleep.sleepStart,
			sleepEnd: storedSleep.sleepEnd,
			sleepQuality: 4,
		});
	});
});

describe('mood service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('omits absent optional strings from the MoodEntry DTO', async () => {
		const mood = {
			id: 1,
			date: '2026-07-26',
			moodScore: 4,
			moodLabel: 'Calm',
			moodEmoji: null,
			note: null,
			createdAt: '2026-07-26T08:00:00.000Z',
			updatedAt: '2026-07-26T08:00:00.000Z',
		};
		moodRepository.getTodayMood.mockResolvedValueOnce(mood);

		await expect(moodService.getTodayMood('7')).resolves.toEqual({
			id: 1,
			date: '2026-07-26',
			moodScore: 4,
			moodLabel: 'Calm',
			createdAt: '2026-07-26T08:00:00.000Z',
			updatedAt: '2026-07-26T08:00:00.000Z',
		});
	});

	test('allows all optional mood fields to be omitted', async () => {
		moodRepository.upsertTodayMood.mockResolvedValueOnce({
			id: 1,
			date: '2026-07-26',
			moodScore: 5,
			moodLabel: null,
			moodEmoji: null,
			note: null,
			createdAt: '2026-07-26T08:00:00.000Z',
			updatedAt: '2026-07-26T08:00:00.000Z',
		});

		await expect(moodService.updateTodayMood(1, { moodScore: 5 }))
			.resolves.not.toHaveProperty('moodLabel');
		expect(moodRepository.upsertTodayMood)
			.toHaveBeenCalledWith(1, { moodScore: 5 });
	});
});

describe('daily service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps numeric database values to the documented daily DTO', async () => {
		dailyRepository.getToday.mockResolvedValueOnce({
			date: '2026-07-26',
			steps: '4321',
			calories: '650.5',
		});

		await expect(dailyService.getToday('7')).resolves.toEqual({
			date: '2026-07-26',
			steps: 4321,
			calories: 650.5,
		});
		expect(dailyRepository.getToday).toHaveBeenCalledWith(7);
	});

	test('passes a partial update without coercing contract values', async () => {
		dailyRepository.upsertToday.mockResolvedValueOnce({
			date: '2026-07-26',
			steps: 0,
			calories: 42.5,
		});

		await dailyService.updateToday(1, { calories: 42.5 });
		expect(dailyRepository.upsertToday).toHaveBeenCalledWith(1, {
			steps: undefined,
			calories: 42.5,
		});
	});
});
