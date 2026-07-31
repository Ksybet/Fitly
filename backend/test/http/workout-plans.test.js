jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));
jest.mock('../../src/utils/db-transaction', () => ({
	withTransaction: async callback => {
		const { pool } = require('../../src/config/db');
		return callback(pool);
	},
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization(userId = 2) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function workoutRow(overrides = {}) {
	return {
		id: 3,
		title: 'Силовая для рук',
		description: 'Описание',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 25,
		estimatedCalories: '220.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date('2026-07-31T08:00:00.000Z'),
		updatedAt: new Date('2026-07-31T09:00:00.000Z'),
		...overrides,
	};
}

function workoutPlanRow(overrides = {}) {
	return {
		id: 7,
		workoutId: 3,
		scheduledAt: new Date('2026-08-10T15:00:00.000Z'),
		reminderMinutesBefore: 45,
		status: 'scheduled',
		completedSessionId: null,
		createdAt: new Date('2026-07-31T10:00:00.000Z'),
		updatedAt: new Date('2026-07-31T10:00:00.000Z'),
		workoutTitle: 'Силовая для рук',
		workoutDescription: 'Описание',
		workoutType: 'strength',
		workoutBodyArea: 'arms',
		workoutIntensity: 'medium',
		workoutDurationMinutes: 25,
		workoutEstimatedCalories: '220.00',
		workoutImageUrl: null,
		workoutIsActive: true,
		...overrides,
	};
}

function expectWorkoutPlan(response, overrides = {}) {
	expect(response.body).toEqual({
		success: true,
		data: {
			id: 7,
			workoutId: 3,
			scheduledAt: '2026-08-10T15:00:00.000Z',
			reminderMinutesBefore: 45,
			workout: {
				id: 3,
				title: 'Силовая для рук',
				description: 'Описание',
				type: 'strength',
				bodyArea: 'arms',
				intensity: 'medium',
				durationMinutes: 25,
				estimatedCalories: 220,
				imageUrl: null,
				isActive: true,
			},
			status: 'scheduled',
			completedSessionId: null,
			createdAt: '2026-07-31T10:00:00.000Z',
			updatedAt: '2026-07-31T10:00:00.000Z',
			...overrides,
		},
		meta: {
			requestId: expect.stringMatching(requestIdPattern),
		},
	});
}

describe('Workout plans HTTP contracts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Date, 'now')
			.mockReturnValue(Date.parse('2026-07-31T12:00:00.000Z'));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('GET returns the user calendar with filters and stable ordering', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ timezone: 'Europe/Moscow' }] })
			.mockResolvedValueOnce({
				rows: [
					workoutPlanRow(),
					workoutPlanRow({
						id: 8,
						scheduledAt: new Date('2026-08-11T15:00:00.000Z'),
					}),
				],
			});

		await request(app)
			.get(
				'/api/v1/workout-plans'
				+ '?from=2026-08-10&to=2026-08-11&status=scheduled',
			)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.success).toBe(true);
				expect(response.body.data.map(plan => plan.id)).toEqual([7, 8]);
				expect(response.body.data[0].workout.title)
					.toBe('Силовая для рук');
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});
		expect(pool.query.mock.calls[1][1]).toEqual([
			2,
			'Europe/Moscow',
			'2026-08-10',
			'2026-08-11',
			'scheduled',
		]);
		expect(pool.query.mock.calls[1][0])
			.toContain('ORDER BY wp.scheduled_at ASC, wp.id ASC');
	});

	test('POST creates a plan with the default reminder', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [workoutRow()] })
			.mockResolvedValueOnce({ rows: [{ id: 7 }] })
			.mockResolvedValueOnce({
				rows: [workoutPlanRow({ reminderMinutesBefore: 30 })],
			});

		await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', authorization())
			.send({
				workoutId: 3,
				scheduledAt: '2026-08-10T18:00:00+03:00',
			})
			.expect(201)
			.expect(response => {
				expectWorkoutPlan(response, { reminderMinutesBefore: 30 });
			});
		expect(pool.query.mock.calls[1][1]).toEqual([
			2,
			3,
			'2026-08-10T18:00:00+03:00',
			30,
		]);
	});

	test('PATCH updates a plan and preserves an omitted reminder', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [workoutPlanRow()] })
			.mockResolvedValueOnce({ rows: [{ exists: false }] })
			.mockResolvedValueOnce({ rows: [workoutRow()] })
			.mockResolvedValueOnce({ rows: [{ id: 7 }] })
			.mockResolvedValueOnce({
				rows: [workoutPlanRow({
					scheduledAt: new Date('2026-08-11T16:00:00.000Z'),
				})],
			});

		await request(app)
			.patch('/api/v1/workout-plans/7')
			.set('Authorization', authorization())
			.send({
				workoutId: 3,
				scheduledAt: '2026-08-11T19:00:00+03:00',
			})
			.expect(200)
			.expect(response => {
				expectWorkoutPlan(response, {
					scheduledAt: '2026-08-11T16:00:00.000Z',
				});
			});
		expect(pool.query.mock.calls[3][1]).toEqual([
			7,
			2,
			3,
			'2026-08-11T19:00:00+03:00',
			null,
		]);
	});

	test('DELETE changes status to cancelled without deleting the row', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [workoutPlanRow()] })
			.mockResolvedValueOnce({ rows: [{ exists: false }] })
			.mockResolvedValueOnce({ rows: [{ id: 7 }] })
			.mockResolvedValueOnce({
				rows: [workoutPlanRow({ status: 'cancelled' })],
			});

		await request(app)
			.delete('/api/v1/workout-plans/7')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expectWorkoutPlan(response, { status: 'cancelled' });
			});
		expect(pool.query.mock.calls[2][0]).toContain(
			"AND status = 'scheduled'",
		);
		expect(pool.query.mock.calls[2][0]).not.toContain('DELETE FROM');
	});

	test.each([
		['GET', '/api/v1/workout-plans?from=2026-02-30', null, 'from', 'INVALID_DATE'],
		['GET', '/api/v1/workout-plans?from=2026-08-11&to=2026-08-10', null, 'to', 'INVALID_RANGE'],
		['GET', '/api/v1/workout-plans?status=pending', null, 'status', 'INVALID_ENUM'],
		['GET', '/api/v1/workout-plans?unknown=1', null, 'unknown', 'UNKNOWN_FIELD'],
		['POST', '/api/v1/workout-plans', {}, 'workoutId', 'REQUIRED'],
		['POST', '/api/v1/workout-plans', {
			workoutId: 3,
			scheduledAt: '2026-08-10T18:00:00',
		}, 'scheduledAt', 'INVALID_DATE_TIME'],
		['POST', '/api/v1/workout-plans', {
			workoutId: 3,
			scheduledAt: '2026-08-10T18:00:00Z',
			reminderMinutesBefore: 10081,
		}, 'reminderMinutesBefore', 'OUT_OF_RANGE'],
		['POST', '/api/v1/workout-plans', {
			workoutId: 3,
			scheduledAt: '2026-08-10T18:00:00Z',
			status: 'completed',
		}, 'status', 'UNKNOWN_FIELD'],
		['PATCH', '/api/v1/workout-plans/0', {
			workoutId: 3,
			scheduledAt: '2026-08-10T18:00:00Z',
		}, 'planId', 'OUT_OF_RANGE'],
	])(
		'rejects invalid %s %s input',
		async (method, url, body, field, code) => {
			let testRequest = request(app)[method.toLowerCase()](url)
				.set('Authorization', authorization());
			if (body !== null) {
				testRequest = testRequest.send(body);
			}

			await testRequest
				.expect(400)
				.expect(response => {
					expect(response.body.error.code).toBe('VALIDATION_ERROR');
					expect(response.body.error.details).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ field, code }),
						]),
					);
				});
			expect(pool.query).not.toHaveBeenCalled();
		},
	);

	test('rejects a plan scheduled in the past', async () => {
		await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', authorization())
			.send({
				workoutId: 3,
				scheduledAt: '2026-07-31T11:59:59Z',
			})
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toContainEqual(
					expect.objectContaining({
						field: 'scheduledAt',
						code: 'SCHEDULED_AT_IN_PAST',
					}),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('returns 404 for an unavailable workout', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', authorization())
			.send({
				workoutId: 999,
				scheduledAt: '2026-08-10T18:00:00Z',
			})
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
	});

	test.each([
		['PATCH', 'cancelled', 'WORKOUT_PLAN_NOT_EDITABLE'],
		['PATCH', 'completed', 'WORKOUT_PLAN_ALREADY_COMPLETED'],
		['DELETE', 'cancelled', 'WORKOUT_PLAN_ALREADY_CANCELLED'],
		['DELETE', 'completed', 'WORKOUT_PLAN_ALREADY_COMPLETED'],
	])(
		'returns a stable conflict for %s on a %s plan',
		async (method, status, code) => {
			pool.query.mockResolvedValueOnce({
				rows: [workoutPlanRow({ status })],
			});
			let testRequest = request(app)[method.toLowerCase()](
				'/api/v1/workout-plans/7',
			).set('Authorization', authorization());
			if (method === 'PATCH') {
				testRequest = testRequest.send({
					workoutId: 3,
					scheduledAt: '2026-08-10T18:00:00Z',
				});
			}

			await testRequest
				.expect(409)
				.expect(response => {
					expect(response.body.error.code).toBe(code);
				});
		},
	);

	test('returns 404 for a foreign plan', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.delete('/api/v1/workout-plans/7')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
		expect(pool.query.mock.calls[0][1]).toEqual([2, 7]);
	});

	test('requires authentication for every workout plan endpoint', async () => {
		await request(app).get('/api/v1/workout-plans').expect(401);
		await request(app).post('/api/v1/workout-plans').send({}).expect(401);
		await request(app).patch('/api/v1/workout-plans/7').send({}).expect(401);
		await request(app).delete('/api/v1/workout-plans/7').expect(401);
		expect(pool.query).not.toHaveBeenCalled();
	});
});
