jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 1, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function goalRow(overrides = {}) {
	return {
		id: 1,
		goalType: 'steps',
		title: 'Walk daily',
		targetValue: 5000,
		unit: 'steps',
		startsOn: '2026-07-26',
		endsOn: null,
		status: 'created',
		currentValue: null,
		progressPercent: 0,
		createdAt: new Date('2026-07-26T12:00:00.000Z'),
		completedAt: null,
		...overrides,
	};
}

function expectGoalEnvelope(response, goals) {
	expect(response.body).toEqual({
		success: true,
		data: { goals },
		meta: {
			requestId: expect.stringMatching(requestIdPattern),
		},
	});
}

describe('Goals HTTP contracts', () => {
	let client;

	beforeEach(() => {
		jest.clearAllMocks();
		client = {
			query: jest.fn().mockResolvedValue({ rows: [] }),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValue(client);
	});

	test('GET /api/v1/goals returns contract Goal DTOs', async () => {
		pool.query.mockResolvedValueOnce({ rows: [goalRow()] });

		await request(app)
			.get('/api/v1/goals')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expectGoalEnvelope(response, [{
				id: 1,
				goalType: 'steps',
				title: 'Walk daily',
				targetValue: 5000,
				unit: 'steps',
				startsOn: '2026-07-26',
				endsOn: null,
				status: 'created',
				currentValue: null,
				progressPercent: 0,
				createdAt: '2026-07-26T12:00:00.000Z',
				completedAt: null,
			}]));
	});

	test('PUT /api/v1/goals replaces goals and returns the current list', async () => {
		const input = {
			goals: [{
				goalType: 'water',
				title: 'Drink water',
				targetValue: 2000,
				unit: 'ml',
				startsOn: '2026-07-26',
				endsOn: null,
			}],
		};
		pool.query.mockResolvedValueOnce({
			rows: [goalRow({
				goalType: 'water',
				title: 'Drink water',
				targetValue: 2000,
				unit: 'ml',
			})],
		});

		await request(app)
			.put('/api/v1/goals')
			.set('Authorization', authorization())
			.send(input)
			.expect(200)
			.expect(response => expectGoalEnvelope(response, [{
				id: 1,
				goalType: 'water',
				title: 'Drink water',
				targetValue: 2000,
				unit: 'ml',
				startsOn: '2026-07-26',
				endsOn: null,
				status: 'created',
				currentValue: null,
				progressPercent: 0,
				createdAt: '2026-07-26T12:00:00.000Z',
				completedAt: null,
			}]));

		expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
		expect(client.query.mock.calls[1][0]).toContain("status = 'cancelled'");
		expect(client.query.mock.calls[2][1]).toEqual([
			1,
			'water',
			'Drink water',
			2000,
			'ml',
			'2026-07-26',
			null,
		]);
		expect(client.query).toHaveBeenNthCalledWith(4, 'COMMIT');
		expect(client.release).toHaveBeenCalledTimes(1);
	});

	test.each([
		[
			{},
			'goals',
			'REQUIRED',
		],
		[
			{ goals: 'invalid' },
			'goals',
			'INVALID_TYPE',
		],
		[
			{ goals: [], unexpected: true },
			'unexpected',
			'UNKNOWN_FIELD',
		],
		[
			{ goals: Array.from({ length: 11 }, () => ({
				goalType: 'steps',
				title: 'Walk',
				targetValue: 1000,
				unit: 'steps',
			})) },
			'goals',
			'TOO_MANY_ITEMS',
		],
		[
			{ goals: [{
				goalType: 'active',
				title: 'Walk',
				targetValue: 1000,
				unit: 'steps',
			}] },
			'goals[0].goalType',
			'INVALID_ENUM',
		],
		[
			{ goals: [{
				goalType: 'steps',
				title: 'a'.repeat(101),
				targetValue: 1000,
				unit: 'steps',
			}] },
			'goals[0].title',
			'INVALID_LENGTH',
		],
		[
			{ goals: [{
				goalType: 'steps',
				title: 'Walk',
				targetValue: '1000',
				unit: 'steps',
			}] },
			'goals[0].targetValue',
			'INVALID_VALUE',
		],
		[
			{ goals: [{
				goalType: 'steps',
				title: 'Walk',
				targetValue: 1000,
				unit: 'steps',
				startsOn: '2026-02-30',
			}] },
			'goals[0].startsOn',
			'INVALID_DATE',
		],
		[
			{ goals: [{
				goalType: 'steps',
				title: 'Walk',
				targetValue: 1000,
				unit: 'steps',
				internal: true,
			}] },
			'goals[0].internal',
			'UNKNOWN_FIELD',
		],
	])('rejects a request outside ReplaceGoalsRequest: %p', async (body, field, code) => {
		await request(app)
			.put('/api/v1/goals')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body).toMatchObject({
					success: false,
					message: 'Request validation failed',
					error: {
						code: 'VALIDATION_ERROR',
						requestId: expect.stringMatching(requestIdPattern),
						details: expect.arrayContaining([
							expect.objectContaining({ field, code }),
						]),
					},
				});
			});

		expect(pool.connect).not.toHaveBeenCalled();
		expect(pool.query).not.toHaveBeenCalled();
	});
});
