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
			 WHERE user_id = $1`,
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

	test('rotates a refresh token once and persists only token hashes', async () => {
		const registerResponse = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'refresh@example.com',
				password: 'Fitly#2026',
			})
			.expect(201);
		const previousRefreshToken = registerResponse.body.data.refreshToken;

		const refreshResponse = await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: previousRefreshToken })
			.expect(200);

		expect(refreshResponse.body.data).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
			tokenType: 'Bearer',
			expiresIn: 3600,
		});
		expect(refreshResponse.body.data).not.toHaveProperty('user');
		expect(refreshResponse.body.data.refreshToken).not.toBe(previousRefreshToken);

		const sessions = await pool.query(
			`SELECT
				refresh_token_hash AS "refreshTokenHash",
				revoked_at AS "revokedAt"
			 FROM auth_sessions
			 WHERE user_id = $1
			 ORDER BY id`,
			[1],
		);

		expect(sessions.rows).toHaveLength(2);
		expect(sessions.rows[0].revokedAt).toEqual(expect.any(Date));
		expect(sessions.rows[1].revokedAt).toBeNull();
		for (const session of sessions.rows) {
			expect(session.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
			expect(session.refreshTokenHash).not.toBe(previousRefreshToken);
			expect(session.refreshTokenHash)
				.not.toBe(refreshResponse.body.data.refreshToken);
		}

		await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: previousRefreshToken })
			.expect(401)
			.expect(response => {
				expect(response.body.error.code).toBe('UNAUTHORIZED');
			});
	});

	test('allows only one concurrent rotation of the same refresh token', async () => {
		const registerResponse = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'concurrent@example.com',
				password: 'Fitly#2026',
			})
			.expect(201);
		const refreshToken = registerResponse.body.data.refreshToken;

		const responses = await Promise.all([
			request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken }),
			request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken }),
		]);

		expect(responses.map(response => response.status).sort())
			.toEqual([200, 401]);

		const sessionCount = await pool.query(
			'SELECT COUNT(*)::integer AS count FROM auth_sessions WHERE user_id = $1',
			[1],
		);
		expect(sessionCount.rows[0].count).toBe(2);
	});

	test('rejects an expired refresh session', async () => {
		const registerResponse = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'expired@example.com',
				password: 'Fitly#2026',
			})
			.expect(201);

		await pool.query(
			`UPDATE auth_sessions
			 SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
			 WHERE user_id = $1`,
			[1],
		);

		await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: registerResponse.body.data.refreshToken })
			.expect(401)
			.expect(response => {
				expect(response.body.error.code).toBe('UNAUTHORIZED');
			});
	});

	test('logs out only a refresh session owned by the authenticated user', async () => {
		const firstUser = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'first@example.com',
				password: 'Fitly#2026',
			})
			.expect(201);
		const secondUser = await request(app)
			.post('/api/v1/auth/register')
			.send({
				email: 'second@example.com',
				password: 'Fitly#2026',
			})
			.expect(201);

		await request(app)
			.post('/api/v1/auth/logout')
			.set('Authorization', `Bearer ${firstUser.body.data.token}`)
			.send({ refreshToken: secondUser.body.data.refreshToken })
			.expect(401);

		const secondRefresh = await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: secondUser.body.data.refreshToken })
			.expect(200);

		await request(app)
			.post('/api/v1/auth/logout')
			.set('Authorization', `Bearer ${firstUser.body.data.token}`)
			.send({ refreshToken: firstUser.body.data.refreshToken })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ completed: true });
			});

		await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: firstUser.body.data.refreshToken })
			.expect(401);

		expect(secondRefresh.body.data.refreshToken).toEqual(expect.any(String));
	});

	test('logs out all sessions for one user without affecting another user', async () => {
		const password = 'Fitly#2026';
		const firstSession = await request(app)
			.post('/api/v1/auth/register')
			.send({ email: 'all@example.com', password })
			.expect(201);
		const secondSession = await request(app)
			.post('/api/v1/auth/login')
			.send({ login: 'all@example.com', password })
			.expect(200);
		const otherUser = await request(app)
			.post('/api/v1/auth/register')
			.send({ email: 'other@example.com', password })
			.expect(201);

		await request(app)
			.post('/api/v1/auth/logout-all')
			.set('Authorization', `Bearer ${firstSession.body.data.token}`)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ completed: true });
			});

		for (const refreshToken of [
			firstSession.body.data.refreshToken,
			secondSession.body.data.refreshToken,
		]) {
			await request(app)
				.post('/api/v1/auth/refresh')
				.send({ refreshToken })
				.expect(401);
		}

		await request(app)
			.post('/api/v1/auth/refresh')
			.send({ refreshToken: otherUser.body.data.refreshToken })
			.expect(200);

		await request(app)
			.post('/api/v1/auth/logout-all')
			.set('Authorization', `Bearer ${firstSession.body.data.token}`)
			.expect(200);
	});
});
