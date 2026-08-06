const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');
const clock =
	require('../../src/modules/workout-sessions/workout-session-clock');

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

async function createUser(email, timezone = 'UTC') {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'hash')
		 RETURNING id`,
		[email],
	);
	const userId = result.rows[0].id;
	await pool.query(
		`INSERT INTO user_settings (user_id, timezone)
		 VALUES ($1, $2)`,
		[userId, timezone],
	);
	return userId;
}

async function insertSession(userId, overrides = {}) {
	const session = {
		workoutId: 3,
		status: 'completed',
		startedAt: '2026-07-31T10:00:00.000Z',
		pausedAt: null,
		finishedAt: '2026-07-31T10:10:00.000Z',
		elapsedSeconds: 600,
		caloriesBurned: 100,
		...overrides,
	};
	const result = await pool.query(
		`INSERT INTO workout_sessions (
			user_id,
			workout_id,
			status,
			started_at,
			paused_at,
			finished_at,
			elapsed_seconds,
			calories_burned
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id`,
		[
			userId,
			session.workoutId,
			session.status,
			session.startedAt,
			session.pausedAt,
			session.finishedAt,
			session.elapsedSeconds,
			session.caloriesBurned,
		],
	);
	return result.rows[0].id;
}

describe('Activity analytics PostgreSQL HTTP contracts', () => {
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
		await pool.query(
			'UPDATE workouts SET estimated_calories = 220 WHERE id = 3',
		);
		jest.spyOn(clock, 'now')
			.mockReturnValue(new Date('2026-07-31T10:00:00.000Z'));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('returns zero totals and a dense daily series for an empty period', async () => {
		const userId = await createUser('analytics-empty@example.com');

		await request(app)
			.get('/api/v1/analytics/activity?period=week&endDate=2026-07-31')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					range: {
						period: 'week',
						from: '2026-07-27',
						to: '2026-07-31',
					},
					workouts: {
						workoutCount: 0,
						totalMinutes: 0,
						caloriesBurned: 0,
					},
					totalSteps: 0,
					points: [
						{
							date: '2026-07-27',
							steps: 0,
							workoutMinutes: 0,
							caloriesBurned: 0,
						},
						{
							date: '2026-07-28',
							steps: 0,
							workoutMinutes: 0,
							caloriesBurned: 0,
						},
						{
							date: '2026-07-29',
							steps: 0,
							workoutMinutes: 0,
							caloriesBurned: 0,
						},
						{
							date: '2026-07-30',
							steps: 0,
							workoutMinutes: 0,
							caloriesBurned: 0,
						},
						{
							date: '2026-07-31',
							steps: 0,
							workoutMinutes: 0,
							caloriesBurned: 0,
						},
					],
				});
			});
	});

	test('aggregates only completed sessions owned by the current user', async () => {
		const userId = await createUser('analytics-owner@example.com');
		const foreignUserId = await createUser('analytics-foreign@example.com');

		await insertSession(userId, {
			startedAt: '2026-07-30T10:00:00.000Z',
			finishedAt: '2026-07-30T10:01:00.000Z',
			elapsedSeconds: 59,
			caloriesBurned: 10.5,
		});
		await insertSession(userId, {
			finishedAt: '2026-07-31T10:01:01.000Z',
			elapsedSeconds: 61,
			caloriesBurned: 20,
		});
		await insertSession(userId, {
			status: 'cancelled',
			elapsedSeconds: 600,
			caloriesBurned: null,
		});
		await insertSession(userId, {
			status: 'paused',
			pausedAt: '2026-07-31T10:05:00.000Z',
			finishedAt: null,
			elapsedSeconds: null,
			caloriesBurned: null,
		});
		await insertSession(foreignUserId, {
			elapsedSeconds: 1800,
			caloriesBurned: 500,
		});
		await insertSession(userId, {
			startedAt: '2026-06-30T09:00:00.000Z',
			finishedAt: '2026-06-30T10:00:00.000Z',
			elapsedSeconds: 3600,
			caloriesBurned: 600,
		});
		await pool.query(
			`INSERT INTO daily_tracking (user_id, tracking_date, steps)
			 VALUES
				($1, DATE '2026-07-30', 100),
				($1, DATE '2026-07-31', 200),
				($2, DATE '2026-07-31', 999)`,
			[userId, foreignUserId],
		);

		await request(app)
			.get('/api/v1/analytics/activity?period=month&endDate=2026-07-31')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.workouts).toEqual({
					workoutCount: 2,
					totalMinutes: 2,
					caloriesBurned: 30.5,
				});
				expect(response.body.data.totalSteps).toBe(300);
				expect(response.body.data.points[29]).toEqual({
					date: '2026-07-30',
					steps: 100,
					workoutMinutes: 0,
					caloriesBurned: 10.5,
				});
				expect(response.body.data.points[30]).toEqual({
					date: '2026-07-31',
					steps: 200,
					workoutMinutes: 1,
					caloriesBurned: 20,
				});
			});
	});

	test('applies week, month, year and local finished-at boundaries', async () => {
		const userId = await createUser(
			'analytics-periods@example.com',
			'America/New_York',
		);
		await insertSession(userId, {
			startedAt: '2026-01-01T12:00:00.000Z',
			finishedAt: '2026-01-01T12:10:00.000Z',
		});
		await insertSession(userId, {
			startedAt: '2026-07-01T12:00:00.000Z',
			finishedAt: '2026-07-01T12:10:00.000Z',
		});
		await insertSession(userId, {
			startedAt: '2026-07-27T04:20:00.000Z',
			finishedAt: '2026-07-27T04:30:00.000Z',
		});
		await insertSession(userId, {
			startedAt: '2026-07-27T03:20:00.000Z',
			finishedAt: '2026-07-27T03:30:00.000Z',
		});

		for (const [period, expectedCount] of [
			['week', 1],
			['month', 3],
			['year', 4],
		]) {
			await request(app)
				.get(
					`/api/v1/analytics/activity?period=${period}&endDate=2026-07-31`,
				)
				.set('Authorization', authorization(userId))
				.expect(200)
				.expect(response => {
					expect(response.body.data.workouts.workoutCount)
						.toBe(expectedCount);
				});
		}
	});

	test('finish immediately adds persisted fallback calories to analytics', async () => {
		const userId = await createUser('analytics-finish@example.com');
		const token = authorization(userId);

		const started = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', token)
			.send({ workoutId: 3 })
			.expect(201);

		await request(app)
			.get('/api/v1/analytics/activity?period=month&endDate=2026-07-31')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.workouts.workoutCount).toBe(0);
			});

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:15:00.000Z'),
		);
		await request(app)
			.post(`/api/v1/workout-sessions/${started.body.data.id}/finish`)
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					status: 'completed',
					elapsedSeconds: 900,
					caloriesBurned: 132,
				});
			});

		await pool.query(
			'UPDATE workouts SET estimated_calories = 1000 WHERE id = 3',
		);
		await request(app)
			.get('/api/v1/analytics/activity?period=month&endDate=2026-07-31')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.workouts).toEqual({
					workoutCount: 1,
					totalMinutes: 15,
					caloriesBurned: 132,
				});
			});
	});

	test('lists only owned sessions with status, local dates and pagination', async () => {
		const userId = await createUser('history-owner@example.com');
		const foreignUserId = await createUser('history-foreign@example.com');
		const firstId = await insertSession(userId, {
			startedAt: '2026-07-01T10:00:00.000Z',
			finishedAt: '2026-07-01T10:10:00.000Z',
		});
		const secondId = await insertSession(userId, {
			startedAt: '2026-07-02T10:00:00.000Z',
			finishedAt: '2026-07-02T10:10:00.000Z',
		});
		await insertSession(userId, {
			status: 'cancelled',
			startedAt: '2026-07-03T10:00:00.000Z',
			finishedAt: '2026-07-03T10:10:00.000Z',
			caloriesBurned: null,
		});
		await insertSession(userId, {
			startedAt: '2026-06-30T10:00:00.000Z',
			finishedAt: '2026-06-30T10:10:00.000Z',
		});
		await insertSession(foreignUserId, {
			startedAt: '2026-07-04T10:00:00.000Z',
			finishedAt: '2026-07-04T10:10:00.000Z',
		});

		await request(app)
			.get(
				'/api/v1/workout-sessions?from=2026-07-01&to=2026-07-31&status=completed&page=1&pageSize=1',
			)
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(item => item.id)).toEqual([secondId]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 1,
					total: 2,
					totalPages: 2,
				});
			});

		await request(app)
			.get(
				'/api/v1/workout-sessions?from=2026-07-01&to=2026-07-31&status=completed&page=2&pageSize=1',
			)
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(item => item.id)).toEqual([firstId]);
			});
	});

	test('migration creates the completed-session analytics index', async () => {
		const result = await pool.query(
			`SELECT indexdef
			 FROM pg_indexes
			 WHERE schemaname = 'public'
			   AND indexname = 'idx_workout_sessions_user_completed_finished'`,
		);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].indexdef).toContain('(user_id, finished_at)');
		expect(result.rows[0].indexdef).toContain('status');
		expect(result.rows[0].indexdef).toContain('completed');
	});
});
