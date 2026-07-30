const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const appTables = [
	'admin_login_attempts',
	'auth_sessions',
	'user_settings',
	'weight_entries',
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

describe('PostgreSQL schema and administrator audit', () => {
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

	test('creates the complete current schema with cascading user data', async () => {
		const tableResult = await pool.query(
			`SELECT table_name
			 FROM information_schema.tables
			 WHERE table_schema = 'public'
			   AND table_name = ANY($1::text[])
			 ORDER BY table_name`,
			[appTables],
		);
		expect(tableResult.rows.map(row => row.table_name))
			.toEqual([...appTables].sort());

		const cascadeResult = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM information_schema.referential_constraints
			 WHERE constraint_schema = 'public'
			   AND delete_rule = 'CASCADE'`,
		);
		expect(cascadeResult.rows[0].count).toBe(11);
	});

	test('restricts user roles and case-insensitive email uniqueness', async () => {
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

		await expect(pool.query(
			`INSERT INTO users (email, password_hash, role)
			 VALUES ($1, $2, $3)`,
			['ADMIN@example.com', 'hash', 'user'],
		)).rejects.toMatchObject({ code: '23505' });
	});

	test('audits administrator logins without exposing inactive account state', async () => {
		const password = 'Strong!Admin123';
		const passwordHash = await bcrypt.hash(password, 4);
		const userResult = await pool.query(
			`INSERT INTO users (email, password_hash, role, is_active)
			 VALUES ($1, $2, 'admin', TRUE)
			 RETURNING id`,
			['admin@example.com', passwordHash],
		);
		const userId = userResult.rows[0].id;

		await request(app)
			.post('/api/v1/auth/login')
			.set('X-Forwarded-For', '203.0.113.10')
			.set('User-Agent', 'Fitly Admin Integration')
			.send({
				login: 'admin@example.com',
				password,
				appVersion: '1.2.3',
			})
			.expect(200);

		await request(app)
			.post('/api/v1/auth/login')
			.set('X-Forwarded-For', '203.0.113.11')
			.set('User-Agent', 'Fitly Admin Integration')
			.send({
				login: 'admin@example.com',
				password: 'wrong-password',
				appVersion: '1.2.3',
			})
			.expect(401)
			.expect(response => {
				expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
			});

		await pool.query(
			'UPDATE users SET is_active = FALSE WHERE id = $1',
			[userId],
		);
		await request(app)
			.post('/api/v1/auth/login')
			.set('X-Forwarded-For', '203.0.113.12')
			.set('User-Agent', 'Fitly Admin Integration')
			.send({
				login: 'admin@example.com',
				password,
				appVersion: '1.2.3',
			})
			.expect(401)
			.expect(response => {
				expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
			});

		const attemptsResult = await pool.query(
			`SELECT
				user_id AS "userId",
				succeeded,
				failure_reason AS "failureReason",
				ip_address::text AS "ipAddress"
			 FROM admin_login_attempts
			 ORDER BY id`,
		);
		expect(attemptsResult.rows).toEqual([
			{
				userId,
				succeeded: true,
				failureReason: null,
				ipAddress: '203.0.113.10/32',
			},
			{
				userId,
				succeeded: false,
				failureReason: 'invalid_password',
				ipAddress: '203.0.113.11/32',
			},
			{
				userId,
				succeeded: false,
				failureReason: 'inactive_account',
				ipAddress: '203.0.113.12/32',
			},
		]);

		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		const preservedResult = await pool.query(
			`SELECT user_id AS "userId", email
			 FROM admin_login_attempts
			 ORDER BY id`,
		);
		expect(preservedResult.rows).toHaveLength(3);
		expect(preservedResult.rows[0]).toEqual({
			userId: null,
			email: 'admin@example.com',
		});
	});
});
