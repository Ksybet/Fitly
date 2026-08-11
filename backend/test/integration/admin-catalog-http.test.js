const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');
const adminCatalogRepository = require('../../src/modules/admin/admin-catalog.repository');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(
			`Integration tests refuse to use non-test database: ${databaseName}`,
		);
	}
}

function authorization(role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId: 1, role },
		process.env.JWT_SECRET,
	)}`;
}

const exerciseRequest = {
	title: 'Integration burpee',
	description: 'Full body integration exercise',
	type: 'cardio',
	bodyArea: 'full_body',
	intensity: 'high',
	instructions: ['Jump', 'Land softly'],
	media: [{ type: 'video', url: 'https://example.com/burpee.mp4' }],
};

const workoutRequest = {
	title: 'Integration workout',
	description: 'Integration workout description',
	type: 'strength',
	bodyArea: 'arms',
	intensity: 'medium',
	durationMinutes: 30,
	estimatedCalories: 250,
	exercises: [
		{ exerciseId: 1, order: 1, sets: 3, repetitions: 10 },
		{ exerciseId: 2, order: 2, durationSeconds: 30, restSeconds: 15 },
	],
};

describe('Admin catalog PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query('DELETE FROM workout_sessions');
		await pool.query('DELETE FROM workout_plans');
		await pool.query('DELETE FROM workouts WHERE id > 4');
		await pool.query('DELETE FROM exercises WHERE id > 11');
		await pool.query('UPDATE exercises SET is_active = TRUE WHERE id <= 11');
		await pool.query('UPDATE workouts SET is_active = TRUE WHERE id <= 4');
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates, lists, updates, deactivates and restores an exercise', async () => {
		const created = await request(app)
			.post('/api/v1/admin/exercises')
			.set('Authorization', authorization())
			.send(exerciseRequest)
			.expect(201);
		const exerciseId = created.body.data.id;

		const listed = await request(app)
			.get('/api/v1/admin/exercises?query=integration&active=true')
			.set('Authorization', authorization())
			.expect(200);
		expect(listed.body.data.map(exercise => exercise.id)).toContain(exerciseId);

		await request(app)
			.patch(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.send({ title: 'Updated integration burpee' })
			.expect(200)
			.expect(response => {
				expect(response.body.data.title).toBe('Updated integration burpee');
			});

		await request(app)
			.delete(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.delete(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200);

		await request(app)
			.get(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(false));

		await request(app)
			.patch(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.send({ isActive: true })
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(true));
	});

	test('deactivating a referenced exercise preserves workout relationships', async () => {
		const before = await pool.query(
			'SELECT COUNT(*)::integer AS total FROM workout_exercises WHERE exercise_id = 1',
		);

		await request(app)
			.delete('/api/v1/admin/exercises/1')
			.set('Authorization', authorization())
			.expect(200);

		const after = await pool.query(
			`SELECT
				(SELECT COUNT(*)::integer FROM workout_exercises WHERE exercise_id = 1) AS relationships,
				(SELECT is_active FROM workouts WHERE id = 1) AS workout_active`,
		);
		expect(after.rows[0]).toEqual({
			relationships: before.rows[0].total,
			workout_active: true,
		});
	});

	test('creates, lists, updates, deactivates and restores a workout', async () => {
		const created = await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send(workoutRequest)
			.expect(201);
		const workoutId = created.body.data.id;
		expect(created.body.data.exercises.map(item => item.exerciseId))
			.toEqual([1, 2]);

		const listed = await request(app)
			.get('/api/v1/admin/workouts?query=integration&active=true')
			.set('Authorization', authorization())
			.expect(200);
		expect(listed.body.data).toEqual([
			expect.objectContaining({
				id: workoutId,
				exercises: [
					expect.objectContaining({ exerciseId: 1, order: 1 }),
					expect.objectContaining({ exerciseId: 2, order: 2 }),
				],
			}),
		]);

		await request(app)
			.patch(`/api/v1/admin/workouts/${workoutId}`)
			.set('Authorization', authorization())
			.send({
				title: 'Updated integration workout',
				exercises: [{ exerciseId: 3, order: 1, sets: 4 }],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data.title).toBe('Updated integration workout');
				expect(response.body.data.exercises).toEqual([
					expect.objectContaining({ exerciseId: 3, order: 1, sets: 4 }),
				]);
			});

		await request(app)
			.delete(`/api/v1/admin/workouts/${workoutId}`)
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.delete(`/api/v1/admin/workouts/${workoutId}`)
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.get(`/api/v1/workouts/catalog/${workoutId}`)
			.set('Authorization', authorization('user'))
			.expect(404);
		await request(app)
			.get(`/api/v1/admin/workouts/${workoutId}`)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(false));

		await request(app)
			.patch(`/api/v1/admin/workouts/${workoutId}`)
			.set('Authorization', authorization())
			.send({ isActive: true })
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(true));
	});

	test('enforces exercise availability according to workout activity', async () => {
		await request(app)
			.delete('/api/v1/admin/exercises/1')
			.set('Authorization', authorization())
			.expect(200);

		await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send({
				...workoutRequest,
				title: 'Rejected active workout',
				exercises: [{ exerciseId: 1, order: 1 }],
			})
			.expect(400)
			.expect(response => {
				expect(response.body.error.details[0].code)
					.toBe('INACTIVE_RESOURCE');
			});

		const inactive = await request(app)
			.post('/api/v1/admin/workouts')
			.set('Authorization', authorization())
			.send({
				...workoutRequest,
				title: 'Allowed inactive workout',
				isActive: false,
				exercises: [{ exerciseId: 1, order: 1 }],
			})
			.expect(201);

		await request(app)
			.patch(`/api/v1/admin/workouts/${inactive.body.data.id}`)
			.set('Authorization', authorization())
			.send({ isActive: true })
			.expect(400)
			.expect(response => {
				expect(response.body.error.details[0].code)
					.toBe('INACTIVE_RESOURCE');
			});
	});

	test('rolls back workout creation when a relationship cannot be inserted', async () => {
		await expect(adminCatalogRepository.createWorkout({
			...workoutRequest,
			title: 'Rolled back workout',
			exercises: [{ exerciseId: 999999, order: 1 }],
		})).rejects.toMatchObject({ code: '23503' });

		const result = await pool.query(
			'SELECT COUNT(*)::integer AS total FROM workouts WHERE title = $1',
			['Rolled back workout'],
		);
		expect(result.rows[0].total).toBe(0);
	});

	test('keeps an existing workout session readable after workout deactivation', async () => {
		const started = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization('user'))
			.send({ workoutId: 1 })
			.expect(201);

		await request(app)
			.delete('/api/v1/admin/workouts/1')
			.set('Authorization', authorization())
			.expect(200);

		await request(app)
			.get(`/api/v1/workout-sessions/${started.body.data.id}`)
			.set('Authorization', authorization('user'))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: started.body.data.id,
					workout: { id: 1, isActive: false },
				});
			});
	});
});
