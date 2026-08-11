jest.mock('../../src/modules/daily/daily.repository', () => ({
	getToday: jest.fn(),
	upsertToday: jest.fn(),
	listSteps: jest.fn(),
	upsertSteps: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const dailyRepository = require('../../src/modules/daily/daily.repository');

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 7, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Health steps HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists a date range and upserts one day', async () => {
		dailyRepository.listSteps.mockResolvedValueOnce([{
			date: '2026-08-01',
			steps: 1234,
			updatedAt: '2026-08-01T10:00:00.000Z',
		}]);
		dailyRepository.upsertSteps.mockResolvedValueOnce({
			date: '2026-08-10',
			steps: 4321,
			updatedAt: '2026-08-10T10:00:00.000Z',
		});

		await request(app)
			.get('/api/v1/health/steps?from=2026-08-01&to=2026-08-31')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([{
					date: '2026-08-01',
					steps: 1234,
					updatedAt: '2026-08-01T10:00:00.000Z',
				}]);
			});
		await request(app)
			.put('/api/v1/health/steps/2026-08-10')
			.set('Authorization', authorization())
			.send({ steps: 4321 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.steps).toBe(4321);
			});
	});

	test('requires authentication and validates filters, date, and steps', async () => {
		await request(app).get('/api/v1/health/steps').expect(401);
		await request(app)
			.get('/api/v1/health/steps?page=1')
			.set('Authorization', authorization())
			.expect(400);
		await request(app)
			.put('/api/v1/health/steps/2026-02-30')
			.set('Authorization', authorization())
			.send({ steps: 10 })
			.expect(400);
		await request(app)
			.put('/api/v1/health/steps/2026-08-10')
			.set('Authorization', authorization())
			.send({ steps: 200001 })
			.expect(400);
	});
});
