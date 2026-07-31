jest.mock(
	'../../src/modules/workout-sessions/workout-sessions.service',
	() => ({
		listWorkoutSessions: jest.fn(),
		startWorkoutSession: jest.fn(),
		getActiveWorkoutSession: jest.fn(),
		getWorkoutSession: jest.fn(),
		pauseWorkoutSession: jest.fn(),
		resumeWorkoutSession: jest.fn(),
		finishWorkoutSession: jest.fn(),
		cancelWorkoutSession: jest.fn(),
	}),
);

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { ApiError } = require('../../src/utils/api-error');
const service =
	require('../../src/modules/workout-sessions/workout-sessions.service');

function authorization(userId = 2) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function sessionDto(overrides = {}) {
	return {
		id: 5,
		workoutId: 3,
		workoutPlanId: null,
		workout: {
			id: 3,
			title: 'Силовая',
			description: 'Описание',
			type: 'strength',
			bodyArea: 'full_body',
			intensity: 'medium',
			durationMinutes: 25,
			estimatedCalories: 220,
			imageUrl: null,
			isActive: true,
		},
		status: 'in_progress',
		startedAt: '2026-07-31T10:00:00.000Z',
		pausedAt: null,
		finishedAt: null,
		elapsedSeconds: 0,
		caloriesBurned: null,
		exerciseResults: [],
		createdAt: '2026-07-31T10:00:00.000Z',
		updatedAt: '2026-07-31T10:00:00.000Z',
		...overrides,
	};
}

describe('Workout sessions HTTP contracts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('POST starts a catalog or planned session', async () => {
		service.startWorkoutSession
			.mockResolvedValueOnce(sessionDto())
			.mockResolvedValueOnce(sessionDto({ workoutPlanId: 12 }));

		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization())
			.send({ workoutId: 3 })
			.expect(201)
			.expect(response => {
				expect(response.body.data).toEqual(sessionDto());
				expect(response.body.meta.requestId).toMatch(
					/^req_[0-9a-f]{32}$/,
				);
			});
		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization())
			.send({ workoutId: 3, workoutPlanId: 12 })
			.expect(201);

		expect(service.startWorkoutSession).toHaveBeenNthCalledWith(
			1,
			2,
			{ workoutId: 3, workoutPlanId: null },
		);
		expect(service.startWorkoutSession).toHaveBeenNthCalledWith(
			2,
			2,
			{ workoutId: 3, workoutPlanId: 12 },
		);
	});

	test('GET active returns a session or data null', async () => {
		service.getActiveWorkoutSession
			.mockResolvedValueOnce(sessionDto({ elapsedSeconds: 300 }))
			.mockResolvedValueOnce(null);

		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data.elapsedSeconds).toBe(300);
			});
		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toHaveProperty('data', null);
			});
	});

	test('GET lists filtered workout sessions with pagination', async () => {
		service.listWorkoutSessions.mockResolvedValueOnce({
			items: [sessionDto({ status: 'completed' })],
			meta: {
				page: 1,
				pageSize: 20,
				total: 1,
				totalPages: 1,
			},
		});

		await request(app)
			.get(
				'/api/v1/workout-sessions?from=2026-07-01&to=2026-07-31&status=completed',
			)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 20,
					total: 1,
					totalPages: 1,
				});
			});
		expect(service.listWorkoutSessions).toHaveBeenCalledWith(2, {
			from: '2026-07-01',
			to: '2026-07-31',
			status: 'completed',
			page: 1,
			pageSize: 20,
		});
	});

	test.each([
		['?from=2026-02-30', 'from', 'INVALID_DATE'],
		['?from=2026-08-01&to=2026-07-31', 'to', 'INVALID_RANGE'],
		['?status=finished', 'status', 'INVALID_ENUM'],
		['?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
		['?unknown=true', 'unknown', 'UNKNOWN_FIELD'],
	])('rejects invalid history query %s', async (query, field, code) => {
		await request(app)
			.get(`/api/v1/workout-sessions${query}`)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ field, code }),
					]),
				);
			});
		expect(service.listWorkoutSessions).not.toHaveBeenCalled();
	});

	test('GET by id returns only the current user session', async () => {
		service.getWorkoutSession.mockResolvedValueOnce(sessionDto());

		await request(app)
			.get('/api/v1/workout-sessions/5')
			.set('Authorization', authorization())
			.expect(200);
		expect(service.getWorkoutSession).toHaveBeenCalledWith(2, 5);
	});

	test.each([
		['pauseWorkoutSession', 'pause', 'paused'],
		['resumeWorkoutSession', 'resume', 'in_progress'],
		['cancelWorkoutSession', 'cancel', 'cancelled'],
	])(
		'POST %s maps the action response',
		async (method, path, status) => {
			service[method].mockResolvedValueOnce(sessionDto({ status }));

			await request(app)
				.post(`/api/v1/workout-sessions/5/${path}`)
				.set('Authorization', authorization())
				.expect(200)
				.expect(response => {
					expect(response.body.data.status).toBe(status);
				});
			expect(service[method]).toHaveBeenCalledWith(2, 5);
		},
	);

	test('POST finish accepts no body and normalized exercise results', async () => {
		service.finishWorkoutSession
			.mockResolvedValueOnce(sessionDto({ status: 'completed' }))
			.mockResolvedValueOnce(sessionDto({
				status: 'completed',
				caloriesBurned: 235,
			}));

		await request(app)
			.post('/api/v1/workout-sessions/5/finish')
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.post('/api/v1/workout-sessions/5/finish')
			.set('Authorization', authorization())
			.send({
				caloriesBurned: 235,
				exerciseResults: [{
					exerciseId: 7,
					completed: true,
					setsCompleted: 3,
				}],
			})
			.expect(200);

		expect(service.finishWorkoutSession).toHaveBeenNthCalledWith(
			1,
			2,
			5,
			{ caloriesBurned: undefined, exerciseResults: [] },
		);
		expect(service.finishWorkoutSession).toHaveBeenNthCalledWith(
			2,
			2,
			5,
			{
				caloriesBurned: 235,
				exerciseResults: [{
					exerciseId: 7,
					completed: true,
					setsCompleted: 3,
				}],
			},
		);
	});

	test.each([
		[
			'/api/v1/workout-sessions',
			{},
			'workoutId',
			'REQUIRED',
		],
		[
			'/api/v1/workout-sessions',
			{ workoutId: 3, userId: 2 },
			'userId',
			'UNKNOWN_FIELD',
		],
		[
			'/api/v1/workout-sessions/5/finish',
			{ caloriesBurned: -1 },
			'caloriesBurned',
			'OUT_OF_RANGE',
		],
		[
			'/api/v1/workout-sessions/5/finish',
			{
				exerciseResults: [
					{ exerciseId: 7, completed: true },
					{ exerciseId: 7, completed: false },
				],
			},
			'exerciseResults[1].exerciseId',
			'DUPLICATE_VALUE',
		],
		[
			'/api/v1/workout-sessions/5/finish',
			{
				exerciseResults: [{
					exerciseId: 7,
					completed: true,
					status: 'completed',
				}],
			},
			'status',
			'UNKNOWN_FIELD',
		],
	])(
		'rejects invalid body for %s',
		async (url, body, field, code) => {
			await request(app)
				.post(url)
				.set('Authorization', authorization())
				.send(body)
				.expect(400)
				.expect(response => {
					expect(response.body.error.code).toBe('VALIDATION_ERROR');
					expect(response.body.error.details).toEqual(
						expect.arrayContaining([
							expect.objectContaining({ field, code }),
						]),
					);
				});
		},
	);

	test('rejects explicit null finish body and invalid session id', async () => {
		await request(app)
			.post('/api/v1/workout-sessions/5/finish')
			.set('Authorization', authorization())
			.set('Content-Type', 'application/json')
			.send('null')
			.expect(400);
		await request(app)
			.get('/api/v1/workout-sessions/2147483648')
			.set('Authorization', authorization())
			.expect(400);
	});

	test('preserves stable service errors', async () => {
		service.startWorkoutSession.mockRejectedValueOnce(new ApiError(
			409,
			'An active workout session already exists',
			{ code: 'ACTIVE_WORKOUT_SESSION_EXISTS' },
		));
		service.getWorkoutSession.mockRejectedValueOnce(
			new ApiError(404, 'Workout session not found'),
		);

		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization())
			.send({ workoutId: 3 })
			.expect(409)
			.expect(response => {
				expect(response.body.error.code)
					.toBe('ACTIVE_WORKOUT_SESSION_EXISTS');
			});
		await request(app)
			.get('/api/v1/workout-sessions/5')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
	});

	test('requires authentication for every endpoint', async () => {
		await request(app).get('/api/v1/workout-sessions').expect(401);
		await request(app).post('/api/v1/workout-sessions').send({}).expect(401);
		await request(app).get('/api/v1/workout-sessions/active').expect(401);
		await request(app).get('/api/v1/workout-sessions/5').expect(401);
		await request(app).post('/api/v1/workout-sessions/5/pause').expect(401);
		await request(app).post('/api/v1/workout-sessions/5/resume').expect(401);
		await request(app).post('/api/v1/workout-sessions/5/finish').expect(401);
		await request(app).post('/api/v1/workout-sessions/5/cancel').expect(401);
		expect(service.startWorkoutSession).not.toHaveBeenCalled();
	});
});
