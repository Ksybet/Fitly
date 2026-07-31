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

async function createUser(email) {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'hash')
		 RETURNING id`,
		[email],
	);
	return result.rows[0].id;
}

async function createPlan(userId, workoutId) {
	const result = await pool.query(
		`INSERT INTO workout_plans (
			user_id,
			workout_id,
			scheduled_at
		 )
		 VALUES ($1, $2, '2026-08-10T15:00:00Z')
		 RETURNING id`,
		[userId, workoutId],
	);
	return result.rows[0].id;
}

describe('Workout sessions PostgreSQL HTTP contracts', () => {
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
				users
			 RESTART IDENTITY CASCADE`,
		);
		await pool.query('UPDATE workouts SET is_active = TRUE WHERE id <= 4');
		jest.spyOn(clock, 'now')
			.mockReturnValue(new Date('2026-07-31T10:00:00.000Z'));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('runs an isolated planned workout lifecycle with exact timing', async () => {
		const firstUserId = await createUser('sessions-first@example.com');
		const secondUserId = await createUser('sessions-second@example.com');
		const planId = await createPlan(firstUserId, 3);
		const firstToken = authorization(firstUserId);
		const secondToken = authorization(secondUserId);

		const firstStart = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', firstToken)
			.send({ workoutId: 3, workoutPlanId: planId })
			.expect(201);
		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', firstToken)
			.send({ workoutId: 1 })
			.expect(409)
			.expect(response => {
				expect(response.body.error.code)
					.toBe('ACTIVE_WORKOUT_SESSION_EXISTS');
			});
		const secondStart = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', secondToken)
			.send({ workoutId: 1 })
			.expect(201);

		await request(app)
			.get(
				`/api/v1/workout-sessions/${secondStart.body.data.id}`,
			)
			.set('Authorization', firstToken)
			.expect(404);
		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', firstToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.id).toBe(firstStart.body.data.id);
			});

		await request(app)
			.patch(`/api/v1/workout-plans/${planId}`)
			.set('Authorization', firstToken)
			.send({
				workoutId: 3,
				scheduledAt: '2026-08-11T15:00:00Z',
			})
			.expect(409)
			.expect(response => {
				expect(response.body.error.code)
					.toBe('WORKOUT_PLAN_HAS_ACTIVE_SESSION');
			});
		await request(app)
			.delete(`/api/v1/workout-plans/${planId}`)
			.set('Authorization', firstToken)
			.expect(409);

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:10:00.000Z'),
		);
		await request(app)
			.post(
				`/api/v1/workout-sessions/${firstStart.body.data.id}/pause`,
			)
			.set('Authorization', firstToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.status).toBe('paused');
				expect(response.body.data.elapsedSeconds).toBe(600);
			});

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:12:00.000Z'),
		);
		await request(app)
			.post(
				`/api/v1/workout-sessions/${firstStart.body.data.id}/resume`,
			)
			.set('Authorization', firstToken)
			.expect(200);

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:17:00.000Z'),
		);
		await request(app)
			.post(
				`/api/v1/workout-sessions/${firstStart.body.data.id}/finish`,
			)
			.set('Authorization', firstToken)
			.send({
				caloriesBurned: 235,
				exerciseResults: [
					{
						exerciseId: 7,
						completed: true,
						setsCompleted: 3,
						repetitionsCompleted: 36,
					},
					{
						exerciseId: 8,
						completed: true,
						durationSeconds: 90,
					},
				],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					status: 'completed',
					elapsedSeconds: 900,
					caloriesBurned: 235,
				});
				expect(response.body.data.exerciseResults).toHaveLength(2);
			});

		const stored = await pool.query(
			`SELECT
				status,
				accumulated_pause_seconds AS "pauseSeconds",
				elapsed_seconds AS "elapsedSeconds"
			 FROM workout_sessions
			 WHERE id = $1`,
			[firstStart.body.data.id],
		);
		expect(stored.rows[0]).toEqual({
			status: 'completed',
			pauseSeconds: 120,
			elapsedSeconds: 900,
		});
		const storedPlan = await pool.query(
			`SELECT
				status,
				completed_session_id AS "completedSessionId"
			 FROM workout_plans
			 WHERE id = $1`,
			[planId],
		);
		expect(storedPlan.rows[0]).toEqual({
			status: 'completed',
			completedSessionId: firstStart.body.data.id,
		});

		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', firstToken)
			.send({ workoutId: 1 })
			.expect(201);
	});

	test('cancels a paused planned session and releases the plan', async () => {
		const userId = await createUser('sessions-cancel@example.com');
		const planId = await createPlan(userId, 3);
		const token = authorization(userId);
		const start = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', token)
			.send({ workoutId: 3, workoutPlanId: planId })
			.expect(201);

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:10:00.000Z'),
		);
		await request(app)
			.post(`/api/v1/workout-sessions/${start.body.data.id}/pause`)
			.set('Authorization', token)
			.expect(200);
		clock.now.mockReturnValue(
			new Date('2026-07-31T10:12:00.000Z'),
		);
		await request(app)
			.post(`/api/v1/workout-sessions/${start.body.data.id}/cancel`)
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					status: 'cancelled',
					elapsedSeconds: 600,
					exerciseResults: [],
				});
			});

		await request(app)
			.patch(`/api/v1/workout-plans/${planId}`)
			.set('Authorization', token)
			.send({
				workoutId: 3,
				scheduledAt: '2026-08-11T15:00:00Z',
			})
			.expect(200);
		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', token)
			.send({ workoutId: 3, workoutPlanId: planId })
			.expect(201);
	});

	test('hides foreign plans and rejects inactive workouts', async () => {
		const firstUserId = await createUser('sessions-owner@example.com');
		const secondUserId = await createUser('sessions-foreign@example.com');
		const planId = await createPlan(firstUserId, 3);

		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization(secondUserId))
			.send({ workoutId: 3, workoutPlanId: planId })
			.expect(404);

		await pool.query('UPDATE workouts SET is_active = FALSE WHERE id = 4');
		await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', authorization(firstUserId))
			.send({ workoutId: 4 })
			.expect(404);
		await request(app)
			.get('/api/v1/workout-sessions/active')
			.set('Authorization', authorization(firstUserId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toBeNull();
			});
	});

	test('enforces database constraints and unique indexes', async () => {
		const userId = await createUser('sessions-constraints@example.com');
		const planId = await createPlan(userId, 3);
		const insertSession = async (overrides = {}) => pool.query(
			`INSERT INTO workout_sessions (
				user_id,
				workout_id,
				workout_plan_id,
				status,
				started_at,
				paused_at,
				finished_at,
				elapsed_seconds,
				accumulated_pause_seconds,
				calories_burned
			 )
			 VALUES (
				$1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9
			 )
			 RETURNING id`,
			[
				userId,
				overrides.workoutId ?? 3,
				overrides.workoutPlanId ?? null,
				overrides.status ?? 'in_progress',
				overrides.pausedAt ?? null,
				overrides.finishedAt ?? null,
				overrides.elapsedSeconds ?? null,
				overrides.pauseSeconds ?? 0,
				overrides.caloriesBurned ?? null,
			],
		);

		await expect(insertSession({ status: 'pending' }))
			.rejects.toMatchObject({ code: '23514' });
		await expect(insertSession({ pauseSeconds: -1 }))
			.rejects.toMatchObject({ code: '23514' });
		await expect(insertSession({ caloriesBurned: -1 }))
			.rejects.toMatchObject({ code: '23514' });
		await expect(insertSession({ workoutId: 999999 }))
			.rejects.toMatchObject({ code: '23503' });

		const first = await insertSession({ workoutPlanId: planId });
		await expect(insertSession())
			.rejects.toMatchObject({
				code: '23505',
				constraint: 'workout_sessions_one_active_per_user_idx',
			});

		await pool.query(
			`UPDATE workout_sessions
			 SET status = 'completed',
			     finished_at = NOW(),
			     elapsed_seconds = 0
			 WHERE id = $1`,
			[first.rows[0].id],
		);
		await expect(insertSession({ workoutPlanId: planId }))
			.rejects.toMatchObject({
				code: '23505',
				constraint:
					'workout_sessions_plan_active_or_completed_idx',
			});

		await expect(pool.query(
			`INSERT INTO workout_session_exercise_results (
				session_id,
				exercise_id,
				completed
			 )
			 VALUES ($1, 999999, TRUE)`,
			[first.rows[0].id],
		)).rejects.toMatchObject({ code: '23503' });
		await pool.query(
			`INSERT INTO workout_session_exercise_results (
				session_id,
				exercise_id,
				completed
			 )
			 VALUES ($1, 7, TRUE)`,
			[first.rows[0].id],
		);
		await expect(pool.query(
			`INSERT INTO workout_session_exercise_results (
				session_id,
				exercise_id,
				completed
			 )
			 VALUES ($1, 7, FALSE)`,
			[first.rows[0].id],
		)).rejects.toMatchObject({ code: '23505' });
	});

	test('serializes concurrent starts and finishes', async () => {
		const userId = await createUser('sessions-concurrency@example.com');
		const token = authorization(userId);

		const starts = await Promise.all([
			request(app)
				.post('/api/v1/workout-sessions')
				.set('Authorization', token)
				.send({ workoutId: 3 }),
			request(app)
				.post('/api/v1/workout-sessions')
				.set('Authorization', token)
				.send({ workoutId: 3 }),
		]);
		expect(starts.map(response => response.status).sort())
			.toEqual([201, 409]);
		const sessionId = starts.find(response => response.status === 201)
			.body.data.id;

		clock.now.mockReturnValue(
			new Date('2026-07-31T10:05:00.000Z'),
		);
		const finishes = await Promise.all([
			request(app)
				.post(`/api/v1/workout-sessions/${sessionId}/finish`)
				.set('Authorization', token),
			request(app)
				.post(`/api/v1/workout-sessions/${sessionId}/finish`)
				.set('Authorization', token),
		]);
		expect(finishes.map(response => response.status).sort())
			.toEqual([200, 409]);
	});

	test('keeps pause and finish races in a consistent final state', async () => {
		const userId = await createUser('sessions-race@example.com');
		const token = authorization(userId);
		const start = await request(app)
			.post('/api/v1/workout-sessions')
			.set('Authorization', token)
			.send({ workoutId: 3 })
			.expect(201);
		clock.now.mockReturnValue(
			new Date('2026-07-31T10:05:00.000Z'),
		);

		const responses = await Promise.all([
			request(app)
				.post(
					`/api/v1/workout-sessions/${start.body.data.id}/pause`,
				)
				.set('Authorization', token),
			request(app)
				.post(
					`/api/v1/workout-sessions/${start.body.data.id}/finish`,
				)
				.set('Authorization', token),
		]);
		expect(responses.some(response => response.status === 200)).toBe(true);

		const stored = await pool.query(
			`SELECT status, paused_at, finished_at, elapsed_seconds
			 FROM workout_sessions
			 WHERE id = $1`,
			[start.body.data.id],
		);
		const row = stored.rows[0];
		expect(['paused', 'completed']).toContain(row.status);
		if (row.status === 'paused') {
			expect(row.paused_at).not.toBeNull();
			expect(row.finished_at).toBeNull();
			expect(row.elapsed_seconds).toBeNull();
		} else {
			expect(row.paused_at).toBeNull();
			expect(row.finished_at).not.toBeNull();
			expect(row.elapsed_seconds).not.toBeNull();
		}
	});
});
