const { pool, closeDatabase } = require('../../src/config/db');

describe('Notification PostgreSQL schema', () => {
	let userId;

	beforeAll(async () => {
		const database = await pool.query('SELECT current_database() AS name');
		if (!database.rows[0].name.endsWith('_test')) {
			throw new Error(`Integration tests refuse to use: ${database.rows[0].name}`);
		}
	});

	beforeEach(async () => {
		await pool.query(`
			TRUNCATE TABLE
				notification_deliveries,
				notification_schedules,
				notifications,
				push_devices,
				users
			RESTART IDENTITY CASCADE
		`);
		const user = await pool.query(
			`INSERT INTO users (email, password_hash, role, is_active)
			 VALUES ('notifications@example.com', 'not-used', 'user', TRUE)
			 RETURNING id`,
		);
		userId = user.rows[0].id;
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates all notification tables', async () => {
		const result = await pool.query(`
			SELECT tablename
			FROM pg_tables
			WHERE schemaname = 'public'
			  AND tablename = ANY($1::text[])
			ORDER BY tablename
		`, [[
			'notification_deliveries',
			'notification_schedules',
			'notifications',
			'push_devices',
		]]);

		expect(result.rows.map(row => row.tablename)).toEqual([
			'notification_deliveries',
			'notification_schedules',
			'notifications',
			'push_devices',
		]);
	});

	test('enforces token, notification and schedule invariants', async () => {
		await expect(pool.query(
			`INSERT INTO push_devices (user_id, platform, push_token)
			 VALUES ($1, 'web', $2)`,
			[userId, 'ExpoPushToken[invalid-platform]'],
		)).rejects.toMatchObject({ code: '23514' });

		await pool.query(
			`INSERT INTO notifications (
				user_id, type, title, body, deduplication_key
			 ) VALUES ($1, 'water', 'Вода', 'Пора выпить воды', 'water:1')`,
			[userId],
		);
		await expect(pool.query(
			`INSERT INTO notifications (
				user_id, type, title, body, deduplication_key
			 ) VALUES ($1, 'water', 'Вода', 'Повтор', 'water:1')`,
			[userId],
		)).rejects.toMatchObject({ code: '23505' });

		await expect(pool.query(
			`INSERT INTO notification_schedules (
				user_id, type, source_key, next_run_at
			 ) VALUES ($1, 'workout', 'workout:1', NOW())`,
			[userId],
		)).rejects.toMatchObject({ code: '23514' });
	});
});
