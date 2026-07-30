const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(
			`Integration tests refuse to use non-test database: ${databaseName}`,
		);
	}
}

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 1, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Workout catalog PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query('DELETE FROM workouts WHERE id > 4');
		await pool.query('DELETE FROM exercises WHERE id > 11');
		await pool.query('UPDATE workouts SET is_active = TRUE WHERE id <= 4');
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('migration creates and seeds the complete catalog model', async () => {
		const result = await pool.query(`
			SELECT
				(SELECT COUNT(*)::integer FROM workouts) AS workouts,
				(SELECT COUNT(*)::integer FROM exercises) AS exercises,
				(
					SELECT COUNT(*)::integer
					FROM workout_exercises
				) AS workout_exercises
		`);

		expect(result.rows[0]).toEqual({
			workouts: 4,
			exercises: 11,
			workout_exercises: 12,
		});
	});

	test('filters, paginates and excludes inactive workouts', async () => {
		await pool.query('UPDATE workouts SET is_active = FALSE WHERE id = 1');

		const filtered = await request(app)
			.get(
				'/api/v1/workouts/catalog?type=strength&bodyArea=full_body'
				+ '&intensity=medium&maxDurationMinutes=30',
			)
			.set('Authorization', authorization())
			.expect(200);

		expect(filtered.body.data.map(workout => workout.id)).toEqual([3]);
		expect(filtered.body.meta).toMatchObject({
			page: 1,
			pageSize: 20,
			total: 1,
			totalPages: 1,
		});

		const firstPage = await request(app)
			.get('/api/v1/workouts/catalog?page=1&pageSize=1')
			.set('Authorization', authorization())
			.expect(200);
		const secondPage = await request(app)
			.get('/api/v1/workouts/catalog?page=2&pageSize=1')
			.set('Authorization', authorization())
			.expect(200);

		expect(firstPage.body.data[0].title).toBe('Кардио для ног');
		expect(secondPage.body.data[0].title).toBe('Растяжка для всего тела');
		expect(firstPage.body.meta.total).toBe(3);
	});

	test('returns workout details in persisted exercise order', async () => {
		const response = await request(app)
			.get('/api/v1/workouts/catalog/1')
			.set('Authorization', authorization())
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: 1,
			type: 'strength',
			bodyArea: 'arms',
			estimatedCalories: 220,
		});
		expect(response.body.data.exercises.map(item => item.exerciseId))
			.toEqual([1, 2, 3]);
		expect(response.body.data.exercises.map(item => item.order))
			.toEqual([1, 2, 3]);
		expect(response.body.data.exercises[1]).toMatchObject({
			sets: 3,
			durationSeconds: 30,
			exercise: {
				title: 'Планка на руках',
				media: [],
			},
		});
	});

	test('hides inactive and unknown workouts behind the same 404', async () => {
		await pool.query('UPDATE workouts SET is_active = FALSE WHERE id = 1');

		for (const workoutId of [1, 999999]) {
			await request(app)
				.get(`/api/v1/workouts/catalog/${workoutId}`)
				.set('Authorization', authorization())
				.expect(404)
				.expect(response => {
					expect(response.body.error.code).toBe('NOT_FOUND');
				});
		}
	});

	test('enforces catalog checks, unique order and foreign keys', async () => {
		await expect(pool.query(`
			INSERT INTO workouts (
				title,
				description,
				type,
				body_area,
				intensity,
				duration_minutes,
				estimated_calories
			)
			VALUES ('Invalid', 'Invalid', 'pilates', 'arms', 'low', 20, 10)
		`)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO workout_exercises (
				workout_id,
				exercise_id,
				sort_order
			 )
			 VALUES (1, 4, 1)`,
		)).rejects.toMatchObject({ code: '23505' });

		await expect(pool.query('DELETE FROM exercises WHERE id = 1'))
			.rejects.toMatchObject({ code: '23503' });
	});
});
