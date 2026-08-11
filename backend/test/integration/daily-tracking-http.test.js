const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const tables = [
	'auth_sessions',
	'weight_entries',
	'admin_login_attempts',
	'user_settings',
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

	afterEach(() => {
		jest.restoreAllMocks();
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
			 VALUES (1, DATE '2026-07-26', 6)`,
		)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO daily_tracking (
				user_id,
				tracking_date,
				steps,
				calories
			 )
			 VALUES (1, DATE '2026-07-26', 200001, 0)`,
		)).rejects.toMatchObject({ code: '23514' });

		await pool.query(
			`INSERT INTO water_entries (
				user_id,
				water_date,
				amount_ml
			 ) VALUES
				(1, DATE '2026-07-26', 250),
				(1, DATE '2026-07-26', 500)`,
		);
		await expect(pool.query(
			`INSERT INTO water_entries (
				user_id,
				water_date,
				amount_ml
			 ) VALUES (1, DATE '2026-07-27', 0)`,
		)).rejects.toMatchObject({ code: '23514' });

		const indexResult = await pool.query(
			`SELECT indexname
			 FROM pg_indexes
			 WHERE schemaname = 'public'
			   AND indexname = 'water_entries_user_date_idx'`,
		);
		expect(indexResult.rows).toEqual([{
			indexname: 'water_entries_user_date_idx',
		}]);
	});

	test('aggregates water events and replaces or clears the local day', async () => {
		const firstPut = await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 500 })
			.expect(200);
		const date = firstPut.body.data.date;

		await pool.query(
			`INSERT INTO water_entries (
				user_id,
				water_date,
				amount_ml
			 ) VALUES
				(1, $1::date, 250),
				(1, $1::date, 125)`,
			[date],
		);

		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.amountMl).toBe(875);
			});

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 300 })
			.expect(200);
		const replaced = await pool.query(
			`SELECT amount_ml AS "amountMl"
			 FROM water_entries
			 WHERE user_id = 1 AND water_date = $1::date`,
			[date],
		);
		expect(replaced.rows).toEqual([{ amountMl: 300 }]);

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 0 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.amountMl).toBe(0);
			});
		const cleared = await pool.query(
			'SELECT id FROM water_entries WHERE user_id = 1',
		);
		expect(cleared.rows).toHaveLength(0);
	});

	test('uses the user local date independently from the PostgreSQL timezone', async () => {
		jest.spyOn(Date, 'now')
			.mockReturnValue(Date.parse('2026-07-27T00:30:00.000Z'));

		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', auth)
			.send({ timezone: 'America/Los_Angeles' })
			.expect(200);

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 750 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.date).toBe('2026-07-26');
			});
		await request(app)
			.put('/api/v1/sleep/today')
			.set('Authorization', auth)
			.send({
				sleepStart: '2026-07-26T06:00:00.000Z',
				sleepEnd: '2026-07-26T14:00:00.000Z',
				sleepQuality: 4,
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data.date).toBe('2026-07-26');
			});
		await request(app)
			.put('/api/v1/mood/today')
			.set('Authorization', auth)
			.send({ moodScore: 5 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.date).toBe('2026-07-26');
			});
		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', auth)
			.send({ steps: 1234 })
			.expect(200)
			.expect(response => {
				expect(response.body.data.date).toBe('2026-07-26');
			});
		await request(app)
			.put('/api/v1/profile')
			.set('Authorization', auth)
			.send({ weightKg: 68 })
			.expect(200);

		const localDates = await Promise.all([
			pool.query('SELECT water_date::text AS date FROM water_entries'),
			pool.query('SELECT sleep_date::text AS date FROM sleep_entries'),
			pool.query('SELECT mood_date::text AS date FROM mood_entries'),
			pool.query('SELECT entry_date::text AS date FROM weight_entries'),
		]);
		for (const result of localDates) {
			expect(result.rows).toEqual([{ date: '2026-07-26' }]);
		}

		Date.now.mockReturnValue(Date.parse('2026-07-27T12:30:00.000Z'));
		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', auth)
			.send({ timezone: 'Pacific/Kiritimati' })
			.expect(200);
		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', auth)
			.send({ steps: 4321 })
			.expect(200);
		await request(app)
			.get('/api/v1/daily/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					date: '2026-07-28',
					steps: 4321,
				});
			});

		const dailyDates = await pool.query(
			`SELECT tracking_date::text AS date
			 FROM daily_tracking
			 ORDER BY tracking_date`,
		);
		expect(dailyDates.rows).toEqual([
			{ date: '2026-07-26' },
			{ date: '2026-07-28' },
		]);
	});
});
