const { pool, closeDatabase } = require('../../src/config/db');
const workerRepository =
	require('../../src/modules/notifications/notification-worker.repository');
const deliveriesRepository =
	require('../../src/modules/notifications/notification-deliveries.repository');

describe('notification worker PostgreSQL coordination', () => {
	let userId;
	const now = new Date('2026-08-08T10:00:00.000Z');

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
			 VALUES ('worker@example.com', 'not-used', 'user', TRUE)
			 RETURNING id`,
		);
		userId = user.rows[0].id;
		await pool.query(
			`INSERT INTO user_settings (user_id, timezone, notifications)
			 VALUES ($1, 'UTC', $2::jsonb)`,
			[userId, JSON.stringify({
				enabled: true,
				waterEnabled: true,
				waterIntervalMinutes: 120,
			})],
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('claims a due schedule once across concurrent workers', async () => {
		await pool.query(
			`INSERT INTO notification_schedules (
				user_id, type, source_key, next_run_at
			 ) VALUES ($1, 'water', $2, $3)`,
			[userId, `water:${userId}`, new Date(now.getTime() - 1000)],
		);
		const first = await pool.connect();
		const second = await pool.connect();
		try {
			await first.query('BEGIN');
			await second.query('BEGIN');
			const claimed = await workerRepository.claimDueSchedules(
				now, 10, 60, first,
			);
			const skipped = await workerRepository.claimDueSchedules(
				now, 10, 60, second,
			);

			expect(claimed).toHaveLength(1);
			expect(skipped).toEqual([]);
			await second.query('COMMIT');
			await first.query('COMMIT');
		} finally {
			first.release();
			second.release();
		}
	});

	test('queues each notification once and does not backfill it later', async () => {
		const device = await pool.query(
			`INSERT INTO push_devices (user_id, platform, push_token)
			 VALUES ($1, 'ios', 'ExpoPushToken[worker-device-token]')
			 RETURNING id`,
			[userId],
		);
		const notification = await pool.query(
			`INSERT INTO notifications (
				user_id, type, title, body, deduplication_key, created_at
			 ) VALUES ($1, 'water', 'Water', 'Drink water', 'water:worker', $2)
			 RETURNING id`,
			[userId, now],
		);
		const claimed = await workerRepository.claimUnqueuedNotifications(
			now, 10, 60,
		);
		expect(claimed).toHaveLength(1);

		await workerRepository.withTransaction(async client => {
			await deliveriesRepository.createForNotification(
				client, notification.rows[0].id, userId, now,
			);
			await workerRepository.markNotificationQueued(
				client, notification.rows[0].id, now,
			);
		});

		expect(await workerRepository.claimUnqueuedNotifications(now, 10, 60))
			.toEqual([]);
		const deliveries = await pool.query(
			`SELECT device_id AS "deviceId" FROM notification_deliveries`,
		);
		expect(deliveries.rows).toEqual([{ deviceId: device.rows[0].id }]);
	});
});
