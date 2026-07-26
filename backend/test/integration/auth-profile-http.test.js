const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const requestIdPattern = /^req_[0-9a-f]{32}$/;
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

describe('Auth, profile, and account PostgreSQL contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('registers, authenticates, updates profile data, and deletes the account', async () => {
		const password = 'Fitly#2026';
		const registerResponse = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'User@Example.com',
				password,
				passwordConfirmation: password,
			})
			.expect(201);

		expect(registerResponse.body).toMatchObject({
			success: true,
			data: {
				token: expect.any(String),
				refreshToken: expect.any(String),
				tokenType: 'Bearer',
				expiresIn: 3600,
				user: {
					id: 1,
					email: 'user@example.com',
					role: 'user',
					status: 'active',
					emailVerified: false,
					appVersion: null,
					createdAt: expect.any(String),
				},
			},
			meta: {
				requestId: expect.stringMatching(requestIdPattern),
			},
		});

		const sessionResult = await pool.query(
			`SELECT refresh_token_hash AS "refreshTokenHash"
			 FROM auth_sessions
			 WHERE user_id = $1`,
			[1],
		);
		expect(sessionResult.rows[0].refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
		expect(sessionResult.rows[0].refreshTokenHash)
			.not.toBe(registerResponse.body.data.refreshToken);

		const loginResponse = await request(app)
			.post('/api/v1/auth/login')
			.send({
				login: 'USER@example.com',
				password,
				appVersion: '1.2.3',
			})
			.expect(200);
		const authorization = `Bearer ${loginResponse.body.data.token}`;

		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 1,
					email: 'user@example.com',
					appVersion: '1.2.3',
					status: 'active',
				});
				expect(response.body.data).not.toHaveProperty('passwordHash');
			});

		await request(app)
			.get('/api/v1/profile')
			.set('Authorization', authorization)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					userId: 1,
					email: 'user@example.com',
					firstName: null,
					birthDate: null,
					age: null,
					gender: null,
					heightCm: null,
					weightKg: null,
					bmi: null,
					updatedAt: expect.any(String),
				});
			});

		await request(app)
			.put('/api/v1/profile')
			.set('Authorization', authorization)
			.send({
				firstName: 'Ada',
				birthDate: '2000-01-02',
				gender: 'prefer_not_to_say',
				heightCm: 170,
				weightKg: 68,
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					userId: 1,
					email: 'user@example.com',
					firstName: 'Ada',
					birthDate: '2000-01-02',
					gender: 'prefer_not_to_say',
					heightCm: 170,
					weightKg: 68,
					bmi: 23.53,
				});
				expect(response.body.data.age).toEqual(expect.any(Number));
			});

		const weightResult = await pool.query(
			`SELECT weight_kg::double precision AS "weightKg"
			 FROM weight_entries
			 WHERE user_id = $1 AND entry_date = CURRENT_DATE`,
			[1],
		);
		expect(weightResult.rows).toEqual([{ weightKg: 68 }]);

		await request(app)
			.delete('/api/v1/profile')
			.set('Authorization', authorization)
			.send({ password })
			.expect(404);

		await request(app)
			.delete('/api/v1/account')
			.set('Authorization', authorization)
			.send({ password, confirmation: 'DELETE' })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ completed: true });
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});

		const userResult = await pool.query(
			'SELECT id FROM users WHERE id = $1',
			[1],
		);
		expect(userResult.rows).toHaveLength(0);
	});

	test('enforces case-insensitive email uniqueness', async () => {
		await request(app)
			.post('/api/v1/auth/register')
			.send({ email: 'user@example.com', password: 'Fitly#2026' })
			.expect(201);

		await request(app)
			.post('/api/v1/auth/register')
			.send({ email: 'USER@example.com', password: 'Fitly#2026' })
			.expect(409)
			.expect(response => {
				expect(response.body.error.code).toBe('STATE_CONFLICT');
				expect(response.body.error.requestId).toMatch(requestIdPattern);
			});
	});
});
