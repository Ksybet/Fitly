const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(`Integration tests refuse to use non-test database: ${databaseName}`);
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

async function createWorkout(title, isActive = true) {
	const result = await pool.query(
		`INSERT INTO workouts (
			title,
			description,
			type,
			body_area,
			intensity,
			duration_minutes,
			estimated_calories,
			is_active
		 )
		 VALUES ($1, 'Описание', 'strength', 'arms', 'medium', 30, 250, $2)
		 RETURNING id`,
		[title, isActive],
	);
	return result.rows[0].id;
}

async function insertPlan(
	userId,
	workoutId,
	scheduledAt,
	status = 'scheduled',
) {
	const result = await pool.query(
		`INSERT INTO workout_plans (
			user_id,
			workout_id,
			scheduled_at,
			status
		 )
		 VALUES ($1, $2, $3, $4)
		 RETURNING id`,
		[userId, workoutId, scheduledAt, status],
	);
	return result.rows[0].id;
}

describe('Workout plans PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		jest.spyOn(Date, 'now')
			.mockReturnValue(Date.parse('2026-07-31T12:00:00.000Z'));
		await pool.query(
			`TRUNCATE TABLE workout_plans, users
			 RESTART IDENTITY CASCADE`,
		);
		await pool.query('DELETE FROM workouts WHERE id > 4');
		await pool.query('UPDATE workouts SET is_active = TRUE WHERE id <= 4');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates, filters, reschedules and cancels isolated plans', async () => {
		const firstUserId = await createUser(
			'plans-first@example.com',
			'Europe/Riga',
		);
		const secondUserId = await createUser(
			'plans-second@example.com',
			'Europe/Riga',
		);
		const workoutId = await createWorkout('Планируемая тренировка');
		const inactiveWorkoutId = await createWorkout(
			'Неактивная тренировка',
			false,
		);
		const firstToken = authorization(firstUserId);
		const secondToken = authorization(secondUserId);
		const scheduledAt = '2026-08-10T18:00:00+03:00';

		const firstPlan = await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', firstToken)
			.send({
				workoutId,
				scheduledAt,
				reminderMinutesBefore: 45,
			})
			.expect(201);
		const secondPlan = await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', firstToken)
			.send({ workoutId, scheduledAt })
			.expect(201);
		await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', secondToken)
			.send({
				workoutId,
				scheduledAt: '2026-08-10T19:00:00+03:00',
			})
			.expect(201);

		expect(firstPlan.body.data).toMatchObject({
			workoutId,
			scheduledAt: '2026-08-10T15:00:00.000Z',
			reminderMinutesBefore: 45,
			status: 'scheduled',
			completedSessionId: null,
			workout: {
				id: workoutId,
				title: 'Планируемая тренировка',
				isActive: true,
			},
		});
		expect(secondPlan.body.data.reminderMinutesBefore).toBe(30);

		await request(app)
			.get(
				'/api/v1/workout-plans'
				+ '?from=2026-08-10&to=2026-08-10&status=scheduled',
			)
			.set('Authorization', firstToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(plan => plan.id)).toEqual([
					firstPlan.body.data.id,
					secondPlan.body.data.id,
				]);
			});

		await request(app)
			.patch(`/api/v1/workout-plans/${firstPlan.body.data.id}`)
			.set('Authorization', firstToken)
			.send({
				workoutId,
				scheduledAt: '2026-08-11T19:00:00+03:00',
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					scheduledAt: '2026-08-11T16:00:00.000Z',
					reminderMinutesBefore: 45,
				});
			});

		await request(app)
			.delete(`/api/v1/workout-plans/${secondPlan.body.data.id}`)
			.set('Authorization', firstToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.status).toBe('cancelled');
			});

		await request(app)
			.get('/api/v1/workout-plans?status=cancelled')
			.set('Authorization', firstToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(plan => plan.id))
					.toEqual([secondPlan.body.data.id]);
			});

		await request(app)
			.delete(`/api/v1/workout-plans/${firstPlan.body.data.id}`)
			.set('Authorization', secondToken)
			.expect(404);
		await request(app)
			.post('/api/v1/workout-plans')
			.set('Authorization', firstToken)
			.send({
				workoutId: inactiveWorkoutId,
				scheduledAt: '2026-08-12T18:00:00Z',
			})
			.expect(404);

		const stored = await pool.query(
			`SELECT id, status, reminder_minutes_before AS reminder
			 FROM workout_plans
			 WHERE user_id = $1
			 ORDER BY id`,
			[firstUserId],
		);
		expect(stored.rows).toEqual([
			{
				id: firstPlan.body.data.id,
				status: 'scheduled',
				reminder: 45,
			},
			{
				id: secondPlan.body.data.id,
				status: 'cancelled',
				reminder: 30,
			},
		]);
	});

	test('uses inclusive local date boundaries across a DST transition', async () => {
		const userId = await createUser(
			'plans-dst@example.com',
			'America/New_York',
		);
		const workoutId = await createWorkout('DST тренировка');
		const token = authorization(userId);

		await insertPlan(userId, workoutId, '2026-03-08T04:59:59Z');
		const firstIncludedId = await insertPlan(
			userId,
			workoutId,
			'2026-03-08T05:00:00Z',
		);
		const secondIncludedId = await insertPlan(
			userId,
			workoutId,
			'2026-03-09T03:59:59Z',
		);
		await insertPlan(userId, workoutId, '2026-03-09T04:00:00Z');

		await request(app)
			.get('/api/v1/workout-plans?from=2026-03-08&to=2026-03-08')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(plan => plan.id)).toEqual([
					firstIncludedId,
					secondIncludedId,
				]);
			});
	});

	test('enforces constraints, foreign keys and state conflicts', async () => {
		const userId = await createUser('plans-constraints@example.com');
		const workoutId = await createWorkout('Ограничения плана');
		const token = authorization(userId);
		const planId = await insertPlan(
			userId,
			workoutId,
			'2026-08-10T15:00:00Z',
			'completed',
		);

		await expect(pool.query(
			`INSERT INTO workout_plans (
				user_id,
				workout_id,
				scheduled_at,
				reminder_minutes_before
			 )
			 VALUES ($1, $2, NOW(), -1)`,
			[userId, workoutId],
		)).rejects.toMatchObject({ code: '23514' });
		await expect(pool.query(
			`INSERT INTO workout_plans (
				user_id,
				workout_id,
				scheduled_at,
				status
			 )
			 VALUES ($1, $2, NOW(), 'pending')`,
			[userId, workoutId],
		)).rejects.toMatchObject({ code: '23514' });
		await expect(pool.query(
			'DELETE FROM workouts WHERE id = $1',
			[workoutId],
		)).rejects.toMatchObject({ code: '23503' });

		await request(app)
			.patch(`/api/v1/workout-plans/${planId}`)
			.set('Authorization', token)
			.send({
				workoutId,
				scheduledAt: '2026-08-11T15:00:00Z',
			})
			.expect(409)
			.expect(response => {
				expect(response.body.error.code)
					.toBe('WORKOUT_PLAN_ALREADY_COMPLETED');
			});
		await request(app)
			.delete(`/api/v1/workout-plans/${planId}`)
			.set('Authorization', token)
			.expect(409)
			.expect(response => {
				expect(response.body.error.code)
					.toBe('WORKOUT_PLAN_ALREADY_COMPLETED');
			});

		const indexResult = await pool.query(
			`SELECT indexname, indexdef
			 FROM pg_indexes
			 WHERE schemaname = 'public'
			   AND indexname = ANY($1::text[])
			 ORDER BY indexname`,
			[[
				'workout_plans_status_scheduled_at_idx',
				'workout_plans_user_scheduled_at_idx',
			]],
		);
		expect(indexResult.rows.map(row => row.indexname)).toEqual([
			'workout_plans_status_scheduled_at_idx',
			'workout_plans_user_scheduled_at_idx',
		]);
		expect(indexResult.rows[0].indexdef).toContain(
			"WHERE ((status)::text = 'scheduled'::text)",
		);

		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		const planCount = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM workout_plans
			 WHERE user_id = $1`,
			[userId],
		);
		expect(planCount.rows[0].count).toBe(0);
	});
});
