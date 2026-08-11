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

function authorization(userId, role = 'user') {
	return `Bearer ${jwt.sign(
		{ userId, role },
		process.env.JWT_SECRET,
	)}`;
}

async function createUser({
	email,
	role = 'user',
	isActive = true,
	emailVerified = false,
	createdAt = '2026-08-05T12:00:00.000Z',
	lastLoginAt = null,
	firstName,
}) {
	const result = await pool.query(
		`INSERT INTO users (
			email,
			password_hash,
			role,
			is_active,
			email_verified,
			created_at,
			updated_at,
			last_login_at
		 )
		 VALUES ($1, 'integration-hash', $2, $3, $4, $5, $5, $6)
		 RETURNING id`,
		[email, role, isActive, emailVerified, createdAt, lastLoginAt],
	);
	const userId = result.rows[0].id;

	if (firstName !== undefined) {
		await pool.query(
			`INSERT INTO profiles (user_id, first_name)
			 VALUES ($1, $2)`,
			[userId, firstName],
		);
	}

	return userId;
}

describe('Admin statistics PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				user_activity_daily,
				auth_sessions,
				profiles,
				user_settings,
				users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('upserts one UTC activity row per user and day', async () => {
		const firstUserId = await createUser({ email: 'first@example.com' });
		const secondUserId = await createUser({ email: 'second@example.com' });

		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization(firstUserId))
			.expect(200);
		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization(firstUserId))
			.expect(200);
		await request(app)
			.get('/api/v1/auth/me')
			.set('Authorization', authorization(secondUserId))
			.expect(200);

		const result = await pool.query(
			`SELECT
				user_id AS "userId",
				COUNT(*)::integer AS total,
				MAX(last_activity_at) AS "lastActivityAt"
			 FROM user_activity_daily
			 GROUP BY user_id
			 ORDER BY user_id`,
		);
		expect(result.rows).toEqual([
			{ userId: firstUserId, total: 1, lastActivityAt: expect.any(Date) },
			{ userId: secondUserId, total: 1, lastActivityAt: expect.any(Date) },
		]);
	});

	test('counts registrations and distinct active users inside inclusive UTC bounds', async () => {
		const adminId = await createUser({
			email: 'admin@example.com',
			role: 'admin',
			createdAt: '2026-08-03T12:00:00.000Z',
		});
		const firstUserId = await createUser({
			email: 'from@example.com',
			createdAt: '2026-08-01T00:00:00.000Z',
		});
		const secondUserId = await createUser({
			email: 'to@example.com',
			createdAt: '2026-08-12T23:59:59.999Z',
		});
		const beforeUserId = await createUser({
			email: 'before@example.com',
			createdAt: '2026-07-31T23:59:59.999Z',
		});
		await createUser({
			email: 'after@example.com',
			createdAt: '2026-08-13T00:00:00.000Z',
		});

		await pool.query(
			`INSERT INTO user_activity_daily (
				user_id,
				activity_date,
				last_activity_at
			 ) VALUES
				($1, '2026-08-01', '2026-08-01T01:00:00Z'),
				($1, '2026-08-02', '2026-08-02T01:00:00Z'),
				($2, '2026-08-12', '2026-08-12T23:00:00Z'),
				($3, '2026-07-31', '2026-07-31T23:00:00Z'),
				($4, '2026-08-10', '2026-08-10T10:00:00Z')`,
		[firstUserId, secondUserId, beforeUserId, adminId],
		);

		await request(app)
			.get('/api/v1/admin/analytics/overview?from=2026-08-01&to=2026-08-12')
			.set('Authorization', authorization(adminId, 'admin'))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({
					from: '2026-08-01',
					to: '2026-08-12',
					registeredUsers: { value: 2 },
					activeUsers: { value: 2 },
				});
			});
	});

	test('lists blocked users with profile and login data using filters', async () => {
		const adminId = await createUser({
			email: 'admin@example.com',
			role: 'admin',
		});
		await createUser({
			email: 'member@example.com',
			isActive: false,
			emailVerified: true,
			createdAt: '2026-08-10T10:00:00.000Z',
			lastLoginAt: '2026-08-11T12:00:00.000Z',
			firstName: 'Member',
		});
		await createUser({
			email: 'other@example.com',
			isActive: true,
		});

		await request(app)
			.get('/api/v1/admin/users?query=MEMBER&role=user&status=blocked&page=1&pageSize=1')
			.set('Authorization', authorization(adminId, 'admin'))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([{
					id: expect.any(Number),
					email: 'member@example.com',
					firstName: 'Member',
					role: 'user',
					status: 'blocked',
					emailVerified: true,
					createdAt: '2026-08-10T10:00:00.000Z',
					lastLoginAt: '2026-08-11T12:00:00.000Z',
				}]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 1,
					total: 1,
					totalPages: 1,
				});
			});
	});
});
