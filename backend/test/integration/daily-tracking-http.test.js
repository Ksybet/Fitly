const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const tables = [
	'auth_sessions',
	'weight_entries',
	'admin_login_attempts',
	'favorites',
	'daily_tracking',
	'mood_entries',
	'sleep_entries',
	'water_entries',
	'goals',
	'profiles',
	'users',
];

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(`Integration tests refuse to use non-test database: ${databaseName}`);
	}
}

function authorization(userId) {
	const token = jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	);
	return `Bearer ${token}`;
}

describe('Daily tracking PostgreSQL contracts', () => {
	let auth;

	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
		const userResult = await pool.query(
			`INSERT INTO users (
				email,
				password_hash,
				role,
				is_active
			 )
			 VALUES ($1, $2, 'user', TRUE)
			 RETURNING id`,
			['tracking@example.com', 'not-used'],
		);
		auth = authorization(userResult.rows[0].id);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('persists contract DTOs and singleton replacement semantics', async () => {
		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					date: expect.any(String),
					amountMl: 0,
					goalMl: 2000,
					progressPercent: 0,
				});
			});

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 750 })
			.expect(200);
		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 500 })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					amountMl: 500,
					goalMl: 2000,
					progressPercent: 25,
				});
			});
		const waterRows = await pool.query(
			'SELECT amount_ml AS "amountMl" FROM water_entries',
		);
		expect(waterRows.rows).toEqual([{ amountMl: 500 }]);

		await request(app)
			.get('/api/v1/sleep/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toBeNull();
			});
		await request(app)
			.put('/api/v1/sleep/today')
			.set('Authorization', auth)
			.send({
				sleepStart: '2026-07-25T22:00:00.000Z',
				sleepEnd: '2026-07-26T06:30:00.000Z',
				sleepQuality: 4,
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 1,
					sleepStart: '2026-07-25T22:00:00.000Z',
					sleepEnd: '2026-07-26T06:30:00.000Z',
					sleepQuality: 4,
					durationMinutes: 510,
				});
			});

		await request(app)
			.get('/api/v1/mood/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toBeNull();
			});
		await request(app)
			.put('/api/v1/mood/today')
			.set('Authorization', auth)
			.send({
				moodScore: 5,
				moodLabel: 'Great',
				moodEmoji: '🙂',
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 1,
					moodScore: 5,
					moodLabel: 'Great',
					moodEmoji: '🙂',
				});
				expect(response.body.data).not.toHaveProperty('userId');
			});

		await request(app)
			.get('/api/v1/favorites')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					water: true,
					weight: true,
					height: true,
					bmi: true,
				});
			});
		await request(app)
			.put('/api/v1/favorites')
			.set('Authorization', auth)
			.send({ water: false })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					water: false,
					weight: true,
					height: true,
					bmi: true,
				});
			});

		await request(app)
			.get('/api/v1/daily/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					date: expect.any(String),
					steps: 0,
					calories: 0,
				});
			});
		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', auth)
			.send({ steps: 1234 })
			.expect(200);
		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', auth)
			.send({ calories: 456.75 })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					steps: 1234,
					calories: 456.75,
				});
			});
	});

	test('enforces migrated database constraints', async () => {
		await expect(pool.query(
			`INSERT INTO mood_entries (
				user_id,
				mood_date,
				mood_score
			 )
			 VALUES (1, CURRENT_DATE, 6)`,
		)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO daily_tracking (
				user_id,
				tracking_date,
				steps,
				calories
			 )
			 VALUES (1, CURRENT_DATE, 200001, 0)`,
		)).rejects.toMatchObject({ code: '23514' });
	});
});
