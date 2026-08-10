const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const pushToken = 'ExpoPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

function authorization(userId) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

describe('Push devices PostgreSQL contracts', () => {
	let firstUserId;
	let secondUserId;

	beforeAll(async () => {
		const database = await pool.query('SELECT current_database() AS name');
		if (!database.rows[0].name.endsWith('_test')) {
			throw new Error(`Integration tests refuse to use: ${database.rows[0].name}`);
		}
	});

	beforeEach(async () => {
		await pool.query('TRUNCATE TABLE push_devices, users RESTART IDENTITY CASCADE');
		const users = await pool.query(
			`INSERT INTO users (email, password_hash, role, is_active)
			 VALUES
				('device-one@example.com', 'not-used', 'user', TRUE),
				('device-two@example.com', 'not-used', 'user', TRUE)
			 RETURNING id, email`,
		);
		const userIdsByEmail = new Map(
			users.rows.map(row => [row.email, row.id]),
		);
		firstUserId = userIdsByEmail.get('device-one@example.com');
		secondUserId = userIdsByEmail.get('device-two@example.com');
	});

	afterAll(async () => closeDatabase());

	test('upserts a token and transfers it to the current authenticated user', async () => {
		const first = await request(app)
			.post('/api/v1/devices')
			.set('Authorization', authorization(firstUserId))
			.send({ platform: 'android', pushToken, appVersion: '1.0.0' })
			.expect(200);

		const second = await request(app)
			.post('/api/v1/devices')
			.set('Authorization', authorization(secondUserId))
			.send({ platform: 'ios', pushToken, appVersion: '2.0.0' })
			.expect(200);

		expect(second.body.data.id).toBe(first.body.data.id);
		const stored = await pool.query(
			`SELECT user_id AS "userId", platform, app_version AS "appVersion"
			 FROM push_devices WHERE push_token = $1`,
			[pushToken],
		);
		expect(stored.rows).toEqual([{
			userId: secondUserId,
			platform: 'ios',
			appVersion: '2.0.0',
		}]);
	});

	test('does not let another user delete the device', async () => {
		const registered = await request(app)
			.post('/api/v1/devices')
			.set('Authorization', authorization(firstUserId))
			.send({ platform: 'android', pushToken })
			.expect(200);

		await request(app)
			.delete(`/api/v1/devices/${registered.body.data.id}`)
			.set('Authorization', authorization(secondUserId))
			.expect(404);
	});
});
