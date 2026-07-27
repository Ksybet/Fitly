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
jest.mock('../../src/modules/favorites/favorites.repository', () => ({
	getFavorites: jest.fn(),
	updateFavorites: jest.fn(),
}));
jest.mock('../../src/modules/daily/daily.repository', () => ({
	getToday: jest.fn(),
	upsertToday: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserLocalDate: jest.fn().mockResolvedValue('2026-07-26'),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const waterRepository = require('../../src/modules/water/water.repository');
const sleepRepository = require('../../src/modules/sleep/sleep.repository');
const moodRepository = require('../../src/modules/mood/mood.repository');
const favoritesRepository = require('../../src/modules/favorites/favorites.repository');
const dailyRepository = require('../../src/modules/daily/daily.repository');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization() {
	const token = jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	);
	return `Bearer ${token}`;
}

function expectSuccess(response, data) {
	expect(response.body).toEqual({
		success: true,
		data,
		meta: {
			requestId: expect.stringMatching(requestIdPattern),
		},
	});
}

describe('daily tracking HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('water uses GET and replace-style PUT with WaterDay responses', async () => {
		waterRepository.getTodayWater.mockResolvedValue({
			date: '2026-07-26',
			amountMl: 250,
			goalMl: 2000,
		});
		waterRepository.setTodayWater.mockResolvedValue({
			date: '2026-07-26',
			amountMl: 500,
			goalMl: 2000,
		});

		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expectSuccess(response, {
				date: '2026-07-26',
				amountMl: 250,
				goalMl: 2000,
				progressPercent: 12.5,
			}));

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', authorization())
			.send({ amountMl: 500 })
			.expect(200)
			.expect(response => expectSuccess(response, {
				date: '2026-07-26',
				amountMl: 500,
				goalMl: 2000,
				progressPercent: 25,
			}));
		expect(waterRepository.setTodayWater)
			.toHaveBeenCalledWith(7, '2026-07-26', 500);

		await request(app)
			.post('/api/v1/water/today')
			.set('Authorization', authorization())
			.send({ amountMl: 250 })
			.expect(404);
		await request(app)
			.delete('/api/v1/water/today')
			.set('Authorization', authorization())
			.expect(404);
	});

	test.each([-1, 20001, 1.5, '250'])(
		'water rejects a non-contract amount %p',
		async amountMl => {
			const response = await request(app)
				.put('/api/v1/water/today')
				.set('Authorization', authorization())
				.send({ amountMl })
				.expect(400);

			expect(response.body).toMatchObject({
				success: false,
				message: 'Request validation failed',
				error: {
					code: 'VALIDATION_ERROR',
					requestId: expect.stringMatching(requestIdPattern),
					details: [
						expect.objectContaining({
							field: 'amountMl',
							code: 'OUT_OF_RANGE',
						}),
					],
				},
			});
			expect(waterRepository.setTodayWater).not.toHaveBeenCalled();
		},
	);

	test('sleep returns null when absent and a calculated SleepEntry when stored', async () => {
		sleepRepository.getTodaySleep.mockResolvedValue(null);
		await request(app)
			.get('/api/v1/sleep/today')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expectSuccess(response, null));

		sleepRepository.upsertTodaySleep.mockResolvedValue({
			id: 3,
			date: '2026-07-26',
			sleepStart: new Date('2026-07-25T22:00:00.000Z'),
			sleepEnd: new Date('2026-07-26T06:00:00.000Z'),
			sleepQuality: 4,
			durationMinutes: 480,
			createdAt: new Date('2026-07-26T06:00:00.000Z'),
			updatedAt: new Date('2026-07-26T06:00:00.000Z'),
		});
		await request(app)
			.put('/api/v1/sleep/today')
			.set('Authorization', authorization())
			.send({
				sleepStart: '2026-07-25T22:00:00.000Z',
				sleepEnd: '2026-07-26T06:00:00.000Z',
				sleepQuality: 4,
			})
			.expect(200)
			.expect(response => expectSuccess(response, {
				id: 3,
				date: '2026-07-26',
				sleepStart: '2026-07-25T22:00:00.000Z',
				sleepEnd: '2026-07-26T06:00:00.000Z',
				sleepQuality: 4,
				durationMinutes: 480,
				createdAt: '2026-07-26T06:00:00.000Z',
				updatedAt: '2026-07-26T06:00:00.000Z',
			}));
	});

	test('sleep validates RFC 3339 timestamps and the quality scale', async () => {
		const response = await request(app)
			.put('/api/v1/sleep/today')
			.set('Authorization', authorization())
			.send({
				sleepStart: '23:00',
				sleepEnd: '07:00',
				sleepQuality: 'good',
			})
			.expect(400);

		expect(response.body.error.details).toEqual(expect.arrayContaining([
			expect.objectContaining({
				field: 'sleepStart',
				code: 'INVALID_DATE_TIME',
			}),
			expect.objectContaining({
				field: 'sleepQuality',
				code: 'OUT_OF_RANGE',
			}),
		]));
	});

	test('mood accepts only the documented score and optional text fields', async () => {
		moodRepository.upsertTodayMood.mockResolvedValue({
			id: 4,
			date: '2026-07-26',
			moodScore: 5,
			moodLabel: null,
			moodEmoji: null,
			note: null,
			createdAt: '2026-07-26T08:00:00.000Z',
			updatedAt: '2026-07-26T08:00:00.000Z',
		});

		await request(app)
			.put('/api/v1/mood/today')
			.set('Authorization', authorization())
			.send({ moodScore: 5 })
			.expect(200)
			.expect(response => expectSuccess(response, {
				id: 4,
				date: '2026-07-26',
				moodScore: 5,
				createdAt: '2026-07-26T08:00:00.000Z',
				updatedAt: '2026-07-26T08:00:00.000Z',
			}));

		await request(app)
			.put('/api/v1/mood/today')
			.set('Authorization', authorization())
			.send({ moodScore: 6 })
			.expect(400);
	});

	test('favorites expose only booleans and default omitted request fields to true', async () => {
		favoritesRepository.getFavorites.mockResolvedValue({
			water: true,
			weight: false,
			height: true,
			bmi: false,
		});
		favoritesRepository.updateFavorites.mockResolvedValue({
			water: false,
			weight: true,
			height: true,
			bmi: true,
		});

		await request(app)
			.get('/api/v1/favorites')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expectSuccess(response, {
				water: true,
				weight: false,
				height: true,
				bmi: false,
			}));

		await request(app)
			.put('/api/v1/favorites')
			.set('Authorization', authorization())
			.send({ water: false })
			.expect(200);
		expect(favoritesRepository.updateFavorites).toHaveBeenCalledWith(7, {
			water: false,
			weight: true,
			height: true,
			bmi: true,
		});
	});

	test('daily returns a non-null summary and preserves partial update semantics', async () => {
		dailyRepository.getToday.mockResolvedValue({
			date: '2026-07-26',
			steps: 0,
			calories: 0,
		});
		dailyRepository.upsertToday.mockResolvedValue({
			date: '2026-07-26',
			steps: 0,
			calories: 123.5,
		});

		await request(app)
			.get('/api/v1/daily/today')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expectSuccess(response, {
				date: '2026-07-26',
				steps: 0,
				calories: 0,
			}));

		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', authorization())
			.send({ calories: 123.5 })
			.expect(200)
			.expect(response => expectSuccess(response, {
				date: '2026-07-26',
				steps: 0,
				calories: 123.5,
			}));

		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', authorization())
			.send({})
			.expect(400);
	});
});
