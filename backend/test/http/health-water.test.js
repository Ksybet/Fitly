jest.mock('../../src/modules/water/water.repository', () => ({
	getTodayWater: jest.fn(),
	setTodayWater: jest.fn(),
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
const waterRepository = require('../../src/modules/water/water.repository');

const input = {
	amountMl: 250,
	consumedAt: '2026-08-10T12:00:00.000Z',
};
const entry = {
	id: 6,
	...input,
	date: '2026-08-10',
	createdAt: '2026-08-10T12:00:00.000Z',
};

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Health water HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('exposes list, add, update, and delete operations', async () => {
		waterRepository.listEntries.mockResolvedValue({ entries: [entry], total: 1 });
		waterRepository.createEntry.mockResolvedValue(entry);
		waterRepository.getTodayWater.mockResolvedValue({
			date: '2026-08-10',
			amountMl: 250,
			goalMl: 2000,
		});
		waterRepository.updateEntry.mockResolvedValue({ ...entry, amountMl: 500 });
		waterRepository.deleteEntry.mockResolvedValue(true);

		await request(app)
			.get('/api/v1/health/water?page=1&pageSize=20')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([entry]);
				expect(response.body.meta.total).toBe(1);
			});
		await request(app)
			.post('/api/v1/health/water')
			.set('Authorization', authorization())
			.send(input)
			.expect(201)
			.expect(response => {
				expect(response.body.data).toEqual({
					entry,
					day: {
						date: '2026-08-10',
						amountMl: 250,
						goalMl: 2000,
						progressPercent: 12.5,
					},
				});
			});
		await request(app)
			.patch('/api/v1/health/water/6')
			.set('Authorization', authorization())
			.send({ amountMl: 500 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.amountMl).toBe(500);
			});
		await request(app)
			.delete('/api/v1/health/water/6')
			.set('Authorization', authorization())
			.expect(200);
	});

	test.each([
		[{ amountMl: 0 }],
		[{ amountMl: 5001 }],
		[{ amountMl: 250, consumedAt: 'yesterday' }],
	])('rejects invalid event input %p', async body => {
		await request(app)
			.post('/api/v1/health/water')
			.set('Authorization', authorization())
			.send(body)
			.expect(400);
	});

	test('validates filters and hides foreign entries', async () => {
		waterRepository.updateEntry.mockResolvedValueOnce(null);
		await request(app)
			.get('/api/v1/health/water?pageSize=101')
			.set('Authorization', authorization())
			.expect(400);
		await request(app)
			.patch('/api/v1/health/water/999')
			.set('Authorization', authorization())
			.send({ amountMl: 250 })
			.expect(404);
	});
});
