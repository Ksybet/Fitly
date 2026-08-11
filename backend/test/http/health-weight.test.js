jest.mock('../../src/modules/weight/weight.repository', () => ({
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	getEntryById: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const weightRepository = require('../../src/modules/weight/weight.repository');

const requestIdPattern = /^req_[0-9a-f]{32}$/;
const entry = {
	id: 3,
	date: '2026-08-10',
	weightKg: 71.5,
	createdAt: '2026-08-10T09:00:00.000Z',
	updatedAt: '2026-08-10T09:00:00.000Z',
};

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Health weight HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('exposes all five weight operations', async () => {
		weightRepository.listEntries.mockResolvedValue({
			entries: [entry],
			total: 1,
		});
		weightRepository.createEntry.mockResolvedValue(entry);
		weightRepository.getEntryById.mockResolvedValue(entry);
		weightRepository.updateEntry.mockResolvedValue({
			...entry,
			weightKg: 70.8,
		});
		weightRepository.deleteEntry.mockResolvedValue(true);

		await request(app)
			.get('/api/v1/health/weight?from=2026-08-01&page=1&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([entry]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
					requestId: expect.stringMatching(requestIdPattern),
				});
			});
		await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', authorization())
			.send({ date: '2026-08-10', weightKg: 71.5 })
			.expect(201);
		await request(app)
			.get('/api/v1/health/weight/3')
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.patch('/api/v1/health/weight/3')
			.set('Authorization', authorization())
			.send({ date: '2026-08-10', weightKg: 70.8 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.weightKg).toBe(70.8);
			});
		await request(app)
			.delete('/api/v1/health/weight/3')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
	});

	test('requires authentication and validates list, body, and ID inputs', async () => {
		await request(app).get('/api/v1/health/weight').expect(401);
		await request(app)
			.get('/api/v1/health/weight?from=2026-02-30')
			.set('Authorization', authorization())
			.expect(400);
		await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', authorization())
			.send({ date: '2026-08-10', weightKg: 19 })
			.expect(400);
		await request(app)
			.get('/api/v1/health/weight/not-an-id')
			.set('Authorization', authorization())
			.expect(400);
	});

	test('returns documented conflicts and not-found errors', async () => {
		weightRepository.createEntry.mockRejectedValueOnce(
			Object.assign(new Error('duplicate'), { code: '23505' }),
		);
		weightRepository.getEntryById.mockResolvedValueOnce(null);

		await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', authorization())
			.send({ date: '2026-08-10', weightKg: 71.5 })
			.expect(409)
			.expect(response => {
				expect(response.body.error.code).toBe('STATE_CONFLICT');
			});
		await request(app)
			.get('/api/v1/health/weight/999')
			.set('Authorization', authorization())
			.expect(404);
	});
});
