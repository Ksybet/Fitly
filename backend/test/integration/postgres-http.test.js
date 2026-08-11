const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const appTables = [
	'admin_login_attempts',
	'achievements',
	'auth_sessions',
	'exercises',
	'notification_deliveries',
	'notification_schedules',
	'notifications',
	'push_devices',
	'user_activity_daily',
	'user_settings',
	'weight_entries',
	'workout_exercises',
	'workout_plans',
	'workouts',
	'favorites',
	'daily_tracking',
	'diary_entries',
	'mood_entries',
	'sleep_entries',
	'support_messages',
	'support_requests',
	'water_entries',
	'workout_session_exercise_results',
	'workout_sessions',
	'user_achievements',
	'goals',
	'profiles',
	'users',
];

const userDataTables = appTables.filter(table => (
	![
		'achievements',
		'exercises',
		'workout_exercises',
		'workouts',
	].includes(table)
));

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
		await pool.query(
			`TRUNCATE TABLE ${userDataTables.join(', ')} RESTART IDENTITY CASCADE`,
		);
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
		expect(cascadeResult.rows[0].count).toBe(27);

		const statisticsSchema = await pool.query(
			`SELECT
				(SELECT is_nullable
				 FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'users'
				   AND column_name = 'last_login_at') AS "lastLoginNullable",
				(SELECT COUNT(*)::integer
				 FROM pg_indexes
				 WHERE schemaname = 'public'
				   AND indexname IN (
					'user_activity_daily_date_user_idx',
					'users_role_created_at_idx'
				   )) AS indexes,
				(SELECT STRING_AGG(
					key_usage.column_name,
					',' ORDER BY key_usage.ordinal_position
				 )
				 FROM information_schema.table_constraints constraint_info
				 INNER JOIN information_schema.key_column_usage key_usage
					ON key_usage.constraint_schema = constraint_info.constraint_schema
					AND key_usage.constraint_name = constraint_info.constraint_name
				 WHERE constraint_info.table_schema = 'public'
				   AND constraint_info.table_name = 'user_activity_daily'
				   AND constraint_info.constraint_type = 'PRIMARY KEY')
					AS "primaryKeyColumns"`,
		);
		expect(statisticsSchema.rows[0]).toEqual({
			lastLoginNullable: 'YES',
			indexes: 2,
			primaryKeyColumns: 'user_id,activity_date',
		});
	});

	test('seeds squat achievements and protects awarded records', async () => {
		const achievementsResult = await pool.query(
			`SELECT
				code,
				exercise_id AS "exerciseId",
				target_value AS "targetValue",
				sort_order AS "sortOrder"
			 FROM achievements
			 ORDER BY sort_order`,
		);
		expect(achievementsResult.rows).toEqual([
			{
				code: 'SQUATS_50',
				exerciseId: 7,
				targetValue: 50,
				sortOrder: 1,
			},
			{
				code: 'SQUATS_100',
				exerciseId: 7,
				targetValue: 100,
				sortOrder: 2,
			},
			{
				code: 'SQUATS_150',
				exerciseId: 7,
				targetValue: 150,
				sortOrder: 3,
			},
		]);

		const userResult = await pool.query(
			`INSERT INTO users (email, password_hash)
			 VALUES ('achievement-owner@example.com', 'hash')
			 RETURNING id`,
		);
		const userId = userResult.rows[0].id;
		const achievementIdResult = await pool.query(
			"SELECT id FROM achievements WHERE code = 'SQUATS_50'",
		);
		const achievementId = achievementIdResult.rows[0].id;

		await pool.query(
			`INSERT INTO user_achievements (
				user_id,
				achievement_id,
				earned_at
			 )
			 VALUES ($1, $2, '2026-08-01T10:00:00Z')`,
			[userId, achievementId],
		);
		await expect(pool.query(
			`INSERT INTO user_achievements (
				user_id,
				achievement_id,
				earned_at
			 )
			 VALUES ($1, $2, '2026-08-01T11:00:00Z')`,
			[userId, achievementId],
		)).rejects.toMatchObject({ code: '23505' });
		await expect(pool.query(
			'DELETE FROM achievements WHERE id = $1',
			[achievementId],
		)).rejects.toMatchObject({ code: '23503' });

		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		const grantsResult = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM user_achievements
			 WHERE user_id = $1`,
			[userId],
		);
		expect(grantsResult.rows[0].count).toBe(0);
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
