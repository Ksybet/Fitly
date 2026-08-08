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
		status: 'completed',
		startedAt: '2026-08-01T04:20:00.000Z',
		finishedAt: '2026-08-01T04:30:00.000Z',
		elapsedSeconds: 600,
		caloriesBurned: 100,
		...overrides,
	};

	await pool.query(
		`INSERT INTO workout_sessions (
			user_id,
			workout_id,
			status,
			started_at,
			finished_at,
			elapsed_seconds,
			calories_burned
		 )
		 VALUES ($1, 3, $2, $3, $4, $5, $6)`,
		[
			userId,
			session.status,
			session.startedAt,
			session.finishedAt,
			session.elapsedSeconds,
			session.caloriesBurned,
		],
	);
}

async function insertMeal(userId, eatenAt, totals) {
	const entry = await pool.query(
		`INSERT INTO meal_entries (user_id, meal_type, eaten_at)
		 VALUES ($1, 'breakfast', $2)
		 RETURNING id`,
		[userId, eatenAt],
	);

	await pool.query(
		`INSERT INTO meal_items (
			meal_entry_id,
			name,
			amount_g,
			calories_per_100g,
			protein_g_per_100g,
			fat_g_per_100g,
			carbs_g_per_100g,
			total_calories,
			total_protein_g,
			total_fat_g,
			total_carbs_g
		 )
		 VALUES ($1, 'Test meal', 100, $2, $3, $4, $5, $2, $3, $4, $5)`,
		[
			entry.rows[0].id,
			totals.calories,
			totals.proteinG,
			totals.fatG,
			totals.carbsG,
		],
	);
}

describe('Analytics summary PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				meal_items,
				meal_entries,
				workout_session_exercise_results,
				workout_sessions,
				daily_tracking,
				weight_entries,
				sleep_entries,
				water_entries,
				mood_entries,
				profiles,
				user_settings,
				users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('returns documented null and zero values for an empty period', async () => {
		const userId = await createUser('summary-empty@example.com');

		await request(app)
			.get('/api/v1/analytics/summary?period=week&endDate=2026-08-06')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					range: {
						period: 'week',
						from: '2026-08-03',
						to: '2026-08-06',
					},
					latestWeightKg: null,
					weightChangeKg: null,
					bmi: null,
					averageSleepMinutes: null,
					averageSleepQuality: null,
					totalWaterMl: 0,
					averageDailyWaterMl: 0,
					totalSteps: 0,
					nutrition: {
						calories: 0,
						proteinG: 0,
						fatG: 0,
						carbsG: 0,
					},
					workouts: {
						workoutCount: 0,
						totalMinutes: 0,
						caloriesBurned: 0,
					},
					averageMoodScore: null,
				});
			});
	});

	test('aggregates owned data using local boundaries and persisted totals', async () => {
		const userId = await createUser(
			'summary-owner@example.com',
			'America/New_York',
		);
		const foreignUserId = await createUser(
			'summary-foreign@example.com',
			'America/New_York',
		);
		await pool.query(
			`INSERT INTO profiles (user_id, height_cm)
			 VALUES ($1, 182), ($2, 190)`,
			[userId, foreignUserId],
		);
		await pool.query(
			`INSERT INTO weight_entries (user_id, entry_date, weight_kg)
			 VALUES
				($1, DATE '2026-07-20', 81),
				($1, DATE '2026-08-01', 79.6),
				($1, DATE '2026-08-06', 78.4),
				($1, DATE '2026-08-07', 77.5),
				($2, DATE '2026-08-06', 99)`,
			[userId, foreignUserId],
		);
		await pool.query(
			`INSERT INTO daily_tracking (user_id, tracking_date, steps)
			 VALUES
				($1, DATE '2026-08-01', 1000),
				($1, DATE '2026-08-06', 2000),
				($2, DATE '2026-08-06', 9999)`,
			[userId, foreignUserId],
		);

		await insertSession(userId);
		await insertSession(userId, {
			startedAt: '2026-08-07T03:28:59.000Z',
			finishedAt: '2026-08-07T03:30:00.000Z',
			elapsedSeconds: 61,
			caloriesBurned: 20.5,
		});
		await insertSession(userId, {
			startedAt: '2026-08-01T03:20:00.000Z',
			finishedAt: '2026-08-01T03:30:00.000Z',
			caloriesBurned: 500,
		});
		await insertSession(userId, {
			startedAt: '2026-08-07T04:20:00.000Z',
			finishedAt: '2026-08-07T04:30:00.000Z',
			caloriesBurned: 500,
		});
		await insertSession(userId, {
			status: 'cancelled',
			caloriesBurned: null,
		});
		await insertSession(foreignUserId, { caloriesBurned: 900 });

		await insertMeal(userId, '2026-08-01T04:30:00.000Z', {
			calories: '100.005',
			proteinG: '10.004',
			fatG: '5.005',
			carbsG: '20.006',
		});
		await insertMeal(userId, '2026-08-07T03:30:00.000Z', {
			calories: '50',
			proteinG: '4',
			fatG: '2',
			carbsG: '8',
		});
		await insertMeal(userId, '2026-08-01T03:30:00.000Z', {
			calories: '500',
			proteinG: '50',
			fatG: '50',
			carbsG: '50',
		});
		await insertMeal(userId, '2026-08-07T04:30:00.000Z', {
			calories: '500',
			proteinG: '50',
			fatG: '50',
			carbsG: '50',
		});
		await insertMeal(foreignUserId, '2026-08-01T04:30:00.000Z', {
			calories: '900',
			proteinG: '90',
			fatG: '90',
			carbsG: '90',
		});

		await pool.query(
			`INSERT INTO sleep_entries (
				user_id,
				sleep_date,
				sleep_start,
				sleep_end,
				sleep_quality
			 )
			 VALUES
				($1, DATE '2026-08-01', '2026-07-31T22:00:00Z', '2026-08-01T05:30:00Z', 4),
				($1, DATE '2026-08-06', '2026-08-05T22:00:00Z', '2026-08-06T05:33:00Z', 5),
				($2, DATE '2026-08-06', '2026-08-05T20:00:00Z', '2026-08-06T06:00:00Z', 1)`,
			[userId, foreignUserId],
		);
		await pool.query(
			`INSERT INTO water_entries (
				user_id,
				amount_ml,
				recorded_at,
				water_date
			 )
			 VALUES
				($1, 1000, '2026-08-01T12:00:00Z', DATE '2026-08-01'),
				($1, 1001, '2026-08-06T12:00:00Z', DATE '2026-08-06'),
				($2, 9000, '2026-08-06T12:00:00Z', DATE '2026-08-06')`,
			[userId, foreignUserId],
		);
		await pool.query(
			`INSERT INTO mood_entries (user_id, mood_date, mood_score)
			 VALUES
				($1, DATE '2026-08-01', 3),
				($1, DATE '2026-08-06', 4),
				($2, DATE '2026-08-06', 1)`,
			[userId, foreignUserId],
		);

		await request(app)
			.get('/api/v1/analytics/summary?period=month&endDate=2026-08-06')
			.set('Authorization', authorization(userId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					range: {
						period: 'month',
						from: '2026-08-01',
						to: '2026-08-06',
					},
					latestWeightKg: 78.4,
					weightChangeKg: -1.2,
					bmi: 23.67,
					averageSleepMinutes: 452,
					averageSleepQuality: 4.5,
					totalWaterMl: 2001,
					averageDailyWaterMl: 334,
					totalSteps: 3000,
					nutrition: {
						calories: 150.01,
						proteinG: 14,
						fatG: 7.01,
						carbsG: 28.01,
					},
					workouts: {
						workoutCount: 2,
						totalMinutes: 11,
						caloriesBurned: 120.5,
					},
					averageMoodScore: 3.5,
				});
			});
	});
});
