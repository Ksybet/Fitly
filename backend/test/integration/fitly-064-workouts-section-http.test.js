const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');
const clock =
	require('../../src/modules/workout-sessions/workout-session-clock');

const STARTED_AT = '2026-07-31T10:00:00.000Z';
const FINISHED_AT = '2026-07-31T10:10:00.000Z';

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(
			`Integration tests refuse to use non-test database: ${databaseName}`,
		);
	}
}

function authorization(userId) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

async function createUser(email) {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'hash')
		 RETURNING id`,
		[email],
	);
	const userId = result.rows[0].id;

	await pool.query(
		`INSERT INTO user_settings (user_id, timezone)
		 VALUES ($1, 'UTC')`,
		[userId],
	);

	return userId;
}

describe('FITLY-064 workouts section PostgreSQL HTTP scenario', () => {
	let currentTime;

	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				workout_session_exercise_results,
				workout_sessions,
				workout_plans,
				daily_tracking,
				user_settings,
				users
				RESTART IDENTITY CASCADE`,
		);
		await pool.query('DELETE FROM workouts WHERE id > 4');
		await pool.query('DELETE FROM exercises WHERE id > 11');
		await pool.query(
			`UPDATE workouts
			 SET is_active = TRUE,
			     estimated_calories = CASE
					WHEN id = 4 THEN 260
					ELSE estimated_calories
			     END
			 WHERE id <= 4`,
		);
		currentTime = STARTED_AT;
		jest.spyOn(clock, 'now')
			.mockImplementation(() => new Date(currentTime));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('runs catalog, timer, history and analytics flow', async () => {
		const userId = await createUser('fitly-064@example.com');
		const token = authorization(userId);

		const initialHistory = await request(app)
			.get('/api/v1/workout-sessions?status=completed&page=1&pageSize=5')
			.set('Authorization', token)
			.expect(200);
		expect(initialHistory.body.data).toEqual([]);
		expect(initialHistory.body.meta).toMatchObject({ total: 0 });

		const initialAnalytics = await request(app)
			.get('/api/v1/analytics/activity?period=week&endDate=2026-07-31')
			.set('Authorization', token)
			.expect(200);
		expect(initialAnalytics.body.data.workouts).toEqual({
			workoutCount: 0,
			totalMinutes: 0,
			caloriesBurned: 0,
		});

		const catalog = await request(app)
			.get('/api/v1/workouts/catalog?intensity=high&bodyArea=legs')
			.set('Authorization', token)
			.expect(200);
		expect(catalog.body.data).toEqual([
			expect.objectContaining({
				id: 4,
				bodyArea: 'legs',
				intensity: 'high',
				durationMinutes: 27,
				estimatedCalories: 260,
			}),
		]);
		expect(catalog.body.meta).toMatchObject({ total: 1 });
		const workoutId = catalog.body.data[0].id;

		const details = await request(app)
			.get(`/api/v1/workouts/catalog/${workoutId}`)
			.set('Authorization', token)
			.expect(200);
		expect(details.body.data.exercises.map(item => item.exerciseId))
			.toEqual([9, 10, 11]);
		expect(details.body.data.exercises).toEqual([
			expect.objectContaining({ order: 1, durationSeconds: 180 }),
			expect.objectContaining({ order: 2, sets: 3, durationSeconds: 30 }),
			expect.objectContaining({ order: 3, sets: 3, repetitions: 10 }),
		]);
		for (const item of details.body.data.exercises) {
			expect(item.exercise.instructions.length).toBeGreaterThan(0);
			expect(item.exercise.media).toEqual(expect.any(Array));
		}

		const started = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', token)
			.send({ workoutId })
			.expect(201);
		expect(started.body.data).toMatchObject({
			workoutId,
			status: 'in_progress',
			startedAt: STARTED_AT,
			elapsedSeconds: 0,
		});
		const sessionId = started.body.data.id;

		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: sessionId,
					status: 'in_progress',
					elapsedSeconds: 0,
				});
			});

		currentTime = FINISHED_AT;
		const finished = await request(app)
			.post(`/api/v1/workout-sessions/${sessionId}/finish`)
			.set('Authorization', token)
			.expect(200);
		expect(finished.body.data).toMatchObject({
			id: sessionId,
			status: 'completed',
			finishedAt: FINISHED_AT,
			elapsedSeconds: 600,
			caloriesBurned: 96,
		});

		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toBeNull();
			});

		const history = await request(app)
			.get('/api/v1/workout-sessions?status=completed&page=1&pageSize=5')
			.set('Authorization', token)
			.expect(200);
		expect(history.body.data).toEqual([
			expect.objectContaining({
				id: sessionId,
				workoutId,
				status: 'completed',
				elapsedSeconds: 600,
				caloriesBurned: 96,
			}),
		]);
		expect(history.body.meta).toMatchObject({ total: 1 });

		const analytics = await request(app)
			.get('/api/v1/analytics/activity?period=week&endDate=2026-07-31')
			.set('Authorization', token)
			.expect(200);
		expect(analytics.body.data.workouts).toEqual({
			workoutCount: 1,
			totalMinutes: 10,
			caloriesBurned: 96,
		});
		expect(analytics.body.data.points.at(-1)).toMatchObject({
			date: '2026-07-31',
			workoutMinutes: 10,
			caloriesBurned: 96,
		});
	});
});
