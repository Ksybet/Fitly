const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(`Integration tests refuse to use non-test database: ${databaseName}`);
	}
}

function authorization(userId) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

async function createUser(email, timezone = 'UTC') {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'hash') RETURNING id`,
		[email],
	);
	const userId = result.rows[0].id;
	await pool.query(
		`INSERT INTO user_settings (user_id, timezone) VALUES ($1, $2)`,
		[userId, timezone],
	);
	return userId;
}

describe('Health sleep PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE sleep_entries, user_settings, users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('uses local wake dates and enforces ownership and date uniqueness', async () => {
		const userId = await createUser('sleep-owner@example.com', 'America/New_York');
		const foreignUserId = await createUser('sleep-foreign@example.com');
		const auth = authorization(userId);
		const firstInput = {
			sleepStart: '2026-08-01T16:00:00.000Z',
			sleepEnd: '2026-08-02T00:30:00.000Z',
			sleepQuality: 4,
		};
		const secondInput = {
			sleepStart: '2026-08-02T16:00:00.000Z',
			sleepEnd: '2026-08-03T00:30:00.000Z',
			sleepQuality: 5,
		};

		const first = await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', auth)
			.send(firstInput)
			.expect(201);
		expect(first.body.data.date).toBe('2026-08-01');
		const second = await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', auth)
			.send(secondInput)
			.expect(201);
		expect(second.body.data.date).toBe('2026-08-02');

		await request(app)
			.post('/api/v1/health/sleep')
			.set('Authorization', auth)
			.send({ ...secondInput, sleepQuality: 3 })
			.expect(409);
		await request(app)
			.get('/api/v1/health/sleep?from=2026-08-01&to=2026-08-02&page=1&pageSize=1')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].id).toBe(second.body.data.id);
				expect(response.body.meta.total).toBe(2);
			});

		await request(app)
			.delete(`/api/v1/health/sleep/${first.body.data.id}`)
			.set('Authorization', authorization(foreignUserId))
			.expect(404);
		await request(app)
			.patch(`/api/v1/health/sleep/${first.body.data.id}`)
			.set('Authorization', auth)
			.send(secondInput)
			.expect(409);

		await request(app)
			.get('/api/v1/analytics/sleep?period=month&endDate=2026-08-31')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.points).toHaveLength(2);
				expect(response.body.data.averageQuality).toBe(4.5);
			});
	});
});
