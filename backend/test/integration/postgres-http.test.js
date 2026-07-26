const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const appTables = [
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

describe('PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(`TRUNCATE TABLE ${appTables.join(', ')} RESTART IDENTITY CASCADE`);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('keeps all authenticated HTTP flows and camelCase response fields', async () => {
		const email = "o'hara@example.com";
		const password = 'strong-password';

		const registerResponse = await request(app)
			.post('/api/v1/auth/register')
			.send({ email, password, appVersion: '1.0.0' })
			.expect(201);

		expect(registerResponse.body).toMatchObject({
			success: true,
			data: { user: { id: 1, email, role: 'user' } },
		});
		expect(registerResponse.body.data.accessToken).toEqual(expect.any(String));

		const loginResponse = await request(app)
			.post('/api/v1/auth/login')
			.send({ login: email, password, appVersion: '1.0.0' })
			.expect(200);
		const authorization = `Bearer ${loginResponse.body.data.accessToken}`;

		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => {
				expect(response.body.data.user).toMatchObject({ userId: 1, email, role: 'user' });
			});

		await request(app)
			.get('/api/v1/profile')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ userId: 1, firstName: null });
			});

		const sqlLikeText = "Ada'; DROP TABLE users; --";
		await request(app)
			.put('/api/v1/profile')
			.set('Authorization', authorization)
			.send({
				firstName: sqlLikeText,
				birthDate: '2000-01-02',
				gender: 'female',
				heightCm: 170.5,
				weightKg: 61.25,
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					userId: 1,
					firstName: sqlLikeText,
					birthDate: expect.any(String),
					heightCm: 170.5,
					weightKg: 61.25,
				});
				expect(new Date(response.body.data.birthDate).toISOString()).toContain('2000-01');
			});

		await request(app)
			.put('/api/v1/goals')
			.set('Authorization', authorization)
			.send({
				goals: [{ goalType: 'steps', title: sqlLikeText, targetValue: 5000.5, unit: 'steps' }],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data[0]).toMatchObject({
					userId: 1,
					goalType: 'steps',
					title: sqlLikeText,
					targetValue: 5000.5,
				});
				expect(typeof response.body.data[0].targetValue).toBe('number');
			});

		await request(app)
			.get('/api/v1/goals')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => expect(response.body.data).toHaveLength(1));

		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', authorization)
			.expect(200, { success: true, data: { totalMl: 0 } });

		await request(app)
			.post('/api/v1/water/today')
			.set('Authorization', authorization)
			.send({ amountMl: 250 })
			.expect(200, { success: true, data: { totalMl: 250 } });

		await request(app)
			.delete('/api/v1/water/today')
			.set('Authorization', authorization)
			.expect(200, { success: true, data: { totalMl: 0 } });

		await request(app)
			.put('/api/v1/sleep/today')
			.set('Authorization', authorization)
			.send({
				sleepStart: '23:00',
				sleepEnd: '07:30',
				sleepHours: 8,
				sleepMinutes: 30,
				sleepQuality: 'good',
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					userId: 1,
					sleepStart: '23:00',
					sleepEnd: '07:30',
					sleepHours: 8,
					sleepMinutes: 30,
					sleepQuality: 'good',
				});
				expect(response.body.data.sleepDate).toEqual(expect.any(String));
			});

		await request(app)
			.get('/api/v1/sleep/today')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => expect(response.body.data.sleepHours).toBe(8));

		await request(app)
			.put('/api/v1/mood/today')
			.set('Authorization', authorization)
			.send({ moodScore: 8, moodLabel: 'Calm', moodEmoji: '🙂', note: sqlLikeText })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					userId: 1,
					moodScore: 8,
					moodLabel: 'Calm',
					moodEmoji: '🙂',
					note: sqlLikeText,
				});
			});

		await request(app)
			.get('/api/v1/mood/today')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => expect(response.body.data.note).toBe(sqlLikeText));

		await request(app)
			.get('/api/v1/favorites')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					userId: 1,
					water: true,
					weight: true,
					height: true,
					bmi: true,
				});
			});

		await request(app)
			.put('/api/v1/favorites')
			.set('Authorization', authorization)
			.send({ water: false, weight: true, height: false, bmi: true })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ water: false, height: false });
			});

		await request(app)
			.put('/api/v1/daily/today')
			.set('Authorization', authorization)
			.send({ steps: 4321, calories: 650 })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ userId: 1, steps: 4321, calories: 650 });
			});

		await request(app)
			.get('/api/v1/daily/today')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => expect(response.body.data.steps).toBe(4321));

		const tableCheck = await pool.query("SELECT to_regclass('public.users') AS name");
		expect(tableCheck.rows[0].name).toBe('users');

		await request(app)
			.delete('/api/v1/profile')
			.set('Authorization', authorization)
			.send({ password })
			.expect(200, { success: true, message: 'Account deleted' });

		await request(app)
			.post('/api/v1/auth/login')
			.send({ login: email, password, appVersion: '1.0.0' })
			.expect(401, { success: false, message: 'Invalid credentials' });

		for (const table of appTables) {
			const countResult = await pool.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
			expect(countResult.rows[0].count).toBe(0);
		}
	});

	test('creates the complete schema with cascading foreign keys', async () => {
		const tableResult = await pool.query(
			`SELECT table_name
			 FROM information_schema.tables
			 WHERE table_schema = 'public'
			   AND table_name = ANY($1::text[])
			 ORDER BY table_name`,
			[appTables],
		);

		expect(tableResult.rows.map(row => row.table_name)).toEqual([...appTables].sort());

		const cascadeResult = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM information_schema.referential_constraints
			 WHERE constraint_schema = 'public'
			   AND delete_rule = 'CASCADE'`,
		);
		expect(cascadeResult.rows[0].count).toBe(7);
	});

	test('restricts user roles to user and admin', async () => {
		await pool.query(
			`INSERT INTO users (email, password_hash, role)
			 VALUES ($1, $2, $3)`,
			['admin@example.com', 'hash', 'admin'],
		);

		await expect(pool.query(
			`INSERT INTO users (email, password_hash, role)
			 VALUES ($1, $2, $3)`,
			['invalid@example.com', 'hash', 'operator'],
		)).rejects.toMatchObject({ code: '23514' });
	});
});
