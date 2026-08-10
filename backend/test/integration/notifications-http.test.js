const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function authorization(userId) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Notifications PostgreSQL contracts', () => {
	let userId;
	let otherUserId;

	beforeAll(async () => {
		const database = await pool.query('SELECT current_database() AS name');
		if (!database.rows[0].name.endsWith('_test')) {
			throw new Error(`Integration tests refuse to use: ${database.rows[0].name}`);
		}
	});

	beforeEach(async () => {
		await pool.query('TRUNCATE TABLE notifications, users RESTART IDENTITY CASCADE');
		const users = await pool.query(
			`INSERT INTO users (email, password_hash, role, is_active)
			 VALUES
				('notification-one@example.com', 'not-used', 'user', TRUE),
				('notification-two@example.com', 'not-used', 'user', TRUE)
			 RETURNING id, email`,
		);
		const userIdsByEmail = new Map(
			users.rows.map(row => [row.email, row.id]),
		);
		userId = userIdsByEmail.get('notification-one@example.com');
		otherUserId = userIdsByEmail.get('notification-two@example.com');

		await pool.query(
			`INSERT INTO notifications (
				user_id, type, title, body, status, deduplication_key, created_at
			 ) VALUES
				($1, 'water', 'Вода', 'Пора выпить воды', 'created', 'water:1', NOW() - INTERVAL '1 minute'),
				($1, 'achievement', 'Достижение', 'Получена награда', 'sent', 'achievement:1', NOW()),
				($2, 'system', 'Чужое', 'Не показывать', 'created', 'system:other', NOW())`,
			[userId, otherUserId],
		);
	});

	afterAll(async () => closeDatabase());

	test('filters, paginates and counts only owned notifications', async () => {
		const auth = authorization(userId);
		await request(app)
			.get('/api/v1/notifications?type=achievement&page=1&pageSize=1')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].type).toBe('achievement');
				expect(response.body.meta.total).toBe(1);
			});

		await request(app)
			.get('/api/v1/notifications/unread-count')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.count).toBe(2);
			});
	});

	test('marks one and all notifications read without exposing foreign rows', async () => {
		const own = await pool.query(
			`SELECT id FROM notifications WHERE deduplication_key = 'water:1'`,
		);
		const foreign = await pool.query(
			`SELECT id FROM notifications WHERE deduplication_key = 'system:other'`,
		);
		const auth = authorization(userId);

		await request(app)
			.post(`/api/v1/notifications/${own.rows[0].id}/read`)
			.set('Authorization', auth)
			.expect(200);
		await request(app)
			.post(`/api/v1/notifications/${own.rows[0].id}/read`)
			.set('Authorization', auth)
			.expect(200);
		await request(app)
			.post(`/api/v1/notifications/${foreign.rows[0].id}/read`)
			.set('Authorization', auth)
			.expect(404);
		await request(app)
			.post('/api/v1/notifications/read-all')
			.set('Authorization', auth)
			.expect(200);

		const unread = await pool.query(
			`SELECT COUNT(*)::integer AS count
			 FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
			[userId],
		);
		expect(unread.rows[0].count).toBe(0);
	});
});
