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

async function insertSession(userId, status, exerciseId, repetitions) {
	const terminal = status === 'completed' || status === 'cancelled';
	const paused = status === 'paused';
	const sessionResult = await pool.query(
		`INSERT INTO workout_sessions (
			user_id,
			workout_id,
			status,
			started_at,
			paused_at,
			finished_at,
			elapsed_seconds
		 )
		 VALUES (
			$1,
			3,
			$2,
			'2026-07-31T10:00:00Z',
			$3,
			$4,
			$5
		 )
		 RETURNING id`,
		[
			userId,
			status,
			paused ? '2026-07-31T10:05:00Z' : null,
			terminal ? '2026-07-31T10:10:00Z' : null,
			terminal ? 600 : null,
		],
	);
	await pool.query(
		`INSERT INTO workout_session_exercise_results (
			session_id,
			exercise_id,
			completed,
			repetitions_completed
		 )
		 VALUES ($1, $2, TRUE, $3)`,
		[sessionResult.rows[0].id, exerciseId, repetitions],
	);
	return sessionResult.rows[0].id;
}

async function finishWorkout(token, repetitions, finishedAt) {
	const start = await request(app)
		.post('/api/v1/workout-sessions')
		.set('Authorization', token)
		.send({ workoutId: 3 })
		.expect(201);
	clock.now.mockReturnValue(finishedAt);

	return request(app)
		.post(`/api/v1/workout-sessions/${start.body.data.id}/finish`)
		.set('Authorization', token)
		.send({
			exerciseResults: [{
				exerciseId: 7,
				completed: true,
				repetitionsCompleted: repetitions,
			}],
		})
		.expect(200);
}

describe('Achievements PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				user_achievements,
				workout_session_exercise_results,
				workout_sessions,
				workout_plans,
				users
			 RESTART IDENTITY CASCADE`,
		);
		jest.spyOn(clock, 'now')
			.mockReturnValue(new Date('2026-08-01T10:00:00.000Z'));
	});

	afterEach(() => jest.restoreAllMocks());

	afterAll(async () => {
		await closeDatabase();
	});

	test('awards crossed thresholds once across sequential workouts', async () => {
		const userId = await createUser('achievement-flow@example.com');
		const otherUserId = await createUser('achievement-other@example.com');
		const token = authorization(userId);

		await finishWorkout(
			token,
			40,
			new Date('2026-08-01T10:15:00.000Z'),
		);
		let grants = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM user_achievements
			 WHERE user_id = $1`,
			[userId],
		);
		expect(grants.rows[0].count).toBe(0);

		await finishWorkout(
			token,
			70,
			new Date('2026-08-01T10:30:00.000Z'),
		);
		await finishWorkout(
			token,
			40,
			new Date('2026-08-01T10:45:00.000Z'),
		);
		const finalFinish = await finishWorkout(
			token,
			10,
			new Date('2026-08-01T11:00:00.000Z'),
		);
		expect(finalFinish.body.data).not.toHaveProperty('achievements');

		await request(app)
			.get('/api/v1/achievements')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(3);
				expect(response.body.data).toEqual([
					expect.objectContaining({
						targetValue: 50,
						status: 'earned',
						currentValue: 160,
						progressPercent: 100,
						earnedAt: '2026-08-01T10:30:00.000Z',
					}),
					expect.objectContaining({
						targetValue: 100,
						status: 'earned',
						currentValue: 160,
						progressPercent: 100,
						earnedAt: '2026-08-01T10:30:00.000Z',
					}),
					expect.objectContaining({
						targetValue: 150,
						status: 'earned',
						currentValue: 160,
						progressPercent: 100,
						earnedAt: '2026-08-01T10:45:00.000Z',
					}),
				]);
			});

		grants = await pool.query(
			`SELECT achievement.code, user_achievement.earned_at AS "earnedAt"
			 FROM user_achievements user_achievement
			 JOIN achievements achievement
				ON achievement.id = user_achievement.achievement_id
			 WHERE user_achievement.user_id = $1
			 ORDER BY achievement.target_value ASC`,
			[userId],
		);
		expect(grants.rows).toEqual([
			{
				code: 'SQUATS_50',
				earnedAt: new Date('2026-08-01T10:30:00.000Z'),
			},
			{
				code: 'SQUATS_100',
				earnedAt: new Date('2026-08-01T10:30:00.000Z'),
			},
			{
				code: 'SQUATS_150',
				earnedAt: new Date('2026-08-01T10:45:00.000Z'),
			},
		]);

		await request(app)
			.get('/api/v1/achievements')
			.set('Authorization', authorization(otherUserId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.every(item => (
					item.status === 'locked' && item.currentValue === 0
				))).toBe(true);
			});
	});

	test('aggregates only matching results from completed sessions', async () => {
		const userId = await createUser('achievement-stats@example.com');
		await insertSession(userId, 'completed', 7, 20);
		await insertSession(userId, 'completed', 7, null);
		await insertSession(userId, 'completed', 1, 500);
		await insertSession(userId, 'cancelled', 7, 500);
		const activeSessionId = await insertSession(
			userId,
			'in_progress',
			7,
			500,
		);

		await request(app)
			.get('/api/v1/achievements/1')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					status: 'in_progress',
					currentValue: 20,
					progressPercent: 40,
				});
			});

		await pool.query(
			`UPDATE workout_sessions
			 SET status = 'paused',
			     paused_at = '2026-07-31T10:05:00Z'
			 WHERE id = $1`,
			[activeSessionId],
		);
		await request(app)
			.get('/api/v1/achievements/1')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.currentValue).toBe(20);
			});
	});
});
