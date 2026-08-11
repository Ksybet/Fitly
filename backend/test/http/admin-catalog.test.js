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

function authorization(role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId: 7, role },
		process.env.JWT_SECRET,
	)}`;
}

function exerciseRow(overrides = {}) {
	return {
		id: 12,
		title: 'Burpee',
		description: 'Full body exercise',
		type: 'cardio',
		bodyArea: 'full_body',
		intensity: 'high',
		instructions: ['Jump'],
		media: [],
		isActive: true,
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

const validExercise = {
	title: 'Burpee',
	description: 'Full body exercise',
	type: 'cardio',
	bodyArea: 'full_body',
	intensity: 'high',
	instructions: ['Jump'],
	media: [{ type: 'video', url: 'https://example.com/burpee.mp4' }],
};

function workoutRow(overrides = {}) {
	return {
		id: 5,
		title: 'Admin workout',
		description: 'Workout description',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 30,
		estimatedCalories: '250.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

function workoutExerciseRow(overrides = {}) {
	return {
		workoutId: 5,
		exerciseId: 1,
		sortOrder: 1,
		sets: 3,
		repetitions: 10,
		durationSeconds: null,
		restSeconds: 30,
		...exerciseRow({ id: 1 }),
		...overrides,
	};
}

const validWorkout = {
	title: 'Admin workout',
	description: 'Workout description',
	type: 'strength',
	bodyArea: 'arms',
	intensity: 'medium',
	durationMinutes: 30,
	estimatedCalories: 250,
	imageUrl: null,
	exercises: [{
		exerciseId: 1,
		order: 1,
		sets: 3,
		repetitions: 10,
		restSeconds: 30,
	}],
};

describe('Admin exercise catalog HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the admin exercise catalog', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/exercises');
		if (token) {
			adminRequest.set('Authorization', token);
		}
		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('lists exercises with search, activity and pagination filters', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [exerciseRow({ isActive: false })] });

		await request(app)
			.get('/api/v1/admin/exercises?query=bur&active=false&page=2&pageSize=5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([
					expect.objectContaining({ id: 12, isActive: false }),
				]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				});
			});

		expect(pool.query.mock.calls[0][1]).toEqual(['%bur%', false]);
		expect(pool.query.mock.calls[1][1]).toEqual(['%bur%', false, 5, 5]);
	});

	test('gets an inactive exercise', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [exerciseRow({ isActive: false })],
		});

		await request(app)
			.get('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 12, isActive: false });
			});
	});

	test('creates an exercise from the documented request', async () => {
		pool.query.mockResolvedValueOnce({ rows: [exerciseRow()] });

		await request(app)
			.post('/api/v1/admin/exercises')
			.set('Authorization', authorization())
			.send(validExercise)
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 12, title: 'Burpee' });
			});
		expect(pool.query.mock.calls[0][1][5]).toBe('["Jump"]');
	});

	test('partially updates and restores an exercise', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [exerciseRow({ title: 'Burpee 2', isActive: true })],
		});

		await request(app)
			.patch('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.send({ title: 'Burpee 2', isActive: true })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					title: 'Burpee 2',
					isActive: true,
				});
			});
		expect(pool.query.mock.calls[0][0]).toContain('title = $2');
	});

	test('deactivates an exercise and returns the shared delete result', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ id: 12 }] });

		await request(app)
			.delete('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
		expect(pool.query.mock.calls[0][0]).toContain('is_active = FALSE');
	});

	test('returns NOT_FOUND for an unknown exercise', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/admin/exercises/999')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
	});

	test.each([
		['get', '/api/v1/admin/exercises/not-an-id', undefined, 'exerciseId'],
		['get', '/api/v1/admin/exercises?active=yes', undefined, 'active'],
		['get', '/api/v1/admin/exercises?pageSize=101', undefined, 'pageSize'],
		['patch', '/api/v1/admin/exercises/12', {}, 'body'],
		['post', '/api/v1/admin/exercises', { ...validExercise, unknown: true }, 'unknown'],
		['post', '/api/v1/admin/exercises', { ...validExercise, title: '   ' }, 'title'],
		['post', '/api/v1/admin/exercises', { ...validExercise, type: 'pilates' }, 'type'],
		['post', '/api/v1/admin/exercises', { ...validExercise, instructions: [] }, 'instructions'],
		['post', '/api/v1/admin/exercises', {
			...validExercise,
			media: [{ type: 'audio', url: 'invalid' }],
		}, 'media[0].type'],
	])('rejects invalid input for %s %s', async (method, url, body, field) => {
		let adminRequest = request(app)[method](url)
			.set('Authorization', authorization());
		if (body !== undefined) {
			adminRequest = adminRequest.send(body);
		}
		await adminRequest
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});
});

describe('Admin workout catalog HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the admin workout catalog', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/workouts');
		if (token) {
			adminRequest.set('Authorization', token);
		}
		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('lists full workouts including inactive records', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [workoutRow({ isActive: false })] })
			.mockResolvedValueOnce({ rows: [workoutExerciseRow()] });

		await request(app)
			.get('/api/v1/admin/workouts?active=false')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([
					expect.objectContaining({
						id: 5,
						isActive: false,
						exercises: [expect.objectContaining({ exerciseId: 1, order: 1 })],
					}),
				]);
			});
	});

	test('gets an inactive workout by id', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [workoutRow({ isActive: false })] })
			.mockResolvedValueOnce({ rows: [workoutExerciseRow()] });

		await request(app)
			.get('/api/v1/admin/workouts/5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 5,
					isActive: false,
					exercises: [{ exerciseId: 1, order: 1 }],
				});
			});
	});

	test('creates a workout and its composition transactionally', async () => {
		const client = {
			query: jest.fn()
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({ rows: [workoutRow()] })
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({ rows: [workoutExerciseRow()] })
				.mockResolvedValueOnce({}),
			release: jest.fn(),
		};
		pool.query.mockResolvedValueOnce({ rows: [{ id: 1, isActive: true }] });
		pool.connect.mockResolvedValueOnce(client);

		await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send(validWorkout)
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 5,
					exercises: [expect.objectContaining({ exerciseId: 1 })],
				});
			});
		expect(client.query.mock.calls.map(call => call[0])).toEqual([
			'BEGIN',
			expect.stringContaining('INSERT INTO workouts'),
			expect.stringContaining('INSERT INTO workout_exercises'),
			expect.stringContaining('FROM workout_exercises'),
			'COMMIT',
		]);
		expect(client.release).toHaveBeenCalled();
	});

	test('partially updates metadata and replaces composition transactionally', async () => {
		const replacement = workoutExerciseRow({ exerciseId: 2, id: 2 });
		const client = {
			query: jest.fn()
				.mockResolvedValueOnce({})
				.mockResolvedValueOnce({ rows: [workoutRow({ title: 'Updated' })] })
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce({ rows: [replacement] })
				.mockResolvedValueOnce({}),
			release: jest.fn(),
		};
		pool.query
			.mockResolvedValueOnce({ rows: [workoutRow()] })
			.mockResolvedValueOnce({ rows: [workoutExerciseRow()] })
			.mockResolvedValueOnce({ rows: [{ id: 2, isActive: true }] });
		pool.connect.mockResolvedValueOnce(client);

		await request(app)
			.patch('/api/v1/admin/workouts/5')
			.set('Authorization', authorization())
			.send({
				title: 'Updated',
				exercises: [{ exerciseId: 2, order: 1 }],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					title: 'Updated',
					exercises: [expect.objectContaining({ exerciseId: 2 })],
				});
			});
		expect(client.query.mock.calls.map(call => call[0])).toEqual([
			'BEGIN',
			expect.stringContaining('UPDATE workouts'),
			'DELETE FROM workout_exercises WHERE workout_id = $1',
			expect.stringContaining('INSERT INTO workout_exercises'),
			expect.stringContaining('FROM workout_exercises'),
			'COMMIT',
		]);
	});

	test('deactivates a workout with the shared delete response', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

		await request(app)
			.delete('/api/v1/admin/workouts/5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expect(response.body.data).toEqual({ deleted: true }));
	});

	test.each([
		[{ ...validWorkout, exercises: [] }, 'exercises'],
		[{ ...validWorkout, durationMinutes: 4 }, 'durationMinutes'],
		[{ ...validWorkout, estimatedCalories: '250' }, 'estimatedCalories'],
		[{ ...validWorkout, imageUrl: 'not-a-uri' }, 'imageUrl'],
		[{
			...validWorkout,
			exercises: [
				{ exerciseId: 1, order: 1 },
				{ exerciseId: 1, order: 2 },
			],
		}, 'exercises[1].exerciseId'],
		[{
			...validWorkout,
			exercises: [{ exerciseId: 1, order: 1, unknown: true }],
		}, 'exercises[0].unknown'],
	])('rejects invalid workout input', async (body, field) => {
		await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('rejects a missing exercise reference as request validation', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send(validWorkout)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual([
					expect.objectContaining({
						field: 'exercises[0].exerciseId',
						code: 'NOT_FOUND',
					}),
				]);
			});
	});
});
