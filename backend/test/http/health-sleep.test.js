jest.mock('../../src/modules/sleep/sleep.repository', () => ({
	getTodaySleep: jest.fn(),
	upsertTodaySleep: jest.fn(),
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserLocalDate: jest.fn().mockResolvedValue('2026-08-10'),
	getUserTimezone: jest.fn().mockResolvedValue('UTC'),
	getDateInTimeZone: jest.fn().mockReturnValue('2026-08-10'),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const sleepRepository = require('../../src/modules/sleep/sleep.repository');

const input = {
	sleepStart: '2026-08-10T00:00:00.000Z',
	sleepEnd: '2026-08-10T08:00:00.000Z',
	sleepQuality: 4,
};
const entry = {
	id: 5,
	date: '2026-08-10',
	...input,
	durationMinutes: 480,
	createdAt: '2026-08-10T08:00:00.000Z',
	updatedAt: '2026-08-10T08:00:00.000Z',
};

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Health sleep HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('exposes list, create, update, and delete operations', async () => {
		sleepRepository.listEntries.mockResolvedValue({ entries: [entry], total: 1 });
		sleepRepository.createEntry.mockResolvedValue(entry);
		sleepRepository.updateEntry.mockResolvedValue({
			...entry,
			sleepQuality: 5,
		});
		sleepRepository.deleteEntry.mockResolvedValue(true);

		await request(app)
			.get('/api/v1/health/sleep?page=1&pageSize=20')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([entry]);
				expect(response.body.meta).toMatchObject({ total: 1, totalPages: 1 });
			});
		await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', authorization())
			.send(input)
			.expect(201);
		await request(app)
			.patch('/api/v1/health/sleep/5')
			.set('Authorization', authorization())
			.send({ ...input, sleepQuality: 5 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.sleepQuality).toBe(5);
			});
		await request(app)
			.delete('/api/v1/health/sleep/5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
	});

	test('validates timestamps, intervals, quality, queries, and IDs', async () => {
		await request(app)
			.get('/api/v1/health/sleep?from=2026-08-11&to=2026-08-10')
			.set('Authorization', authorization())
			.expect(400);
		await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', authorization())
			.send({ ...input, sleepQuality: 6 })
			.expect(400);
		await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', authorization())
			.send({ ...input, sleepEnd: input.sleepStart })
			.expect(400);
		await request(app)
			.delete('/api/v1/health/sleep/0')
			.set('Authorization', authorization())
			.expect(400);
	});

	test('returns 409 for duplicate dates and 404 for foreign entries', async () => {
		sleepRepository.createEntry.mockRejectedValueOnce(
			Object.assign(new Error('duplicate'), { code: '23505' }),
		);
		sleepRepository.deleteEntry.mockResolvedValueOnce(false);

		await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', authorization())
			.send(input)
			.expect(409);
		await request(app)
			.delete('/api/v1/health/sleep/999')
			.set('Authorization', authorization())
			.expect(404);
	});
});
