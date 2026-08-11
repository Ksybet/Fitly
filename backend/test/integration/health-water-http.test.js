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

async function createUser(email) {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, 'hash') RETURNING id`,
		[email],
	);
	const userId = result.rows[0].id;
	await pool.query(
		`INSERT INTO user_settings (user_id, timezone)
		 VALUES ($1, 'UTC')`,
		[userId],
	);
	return userId;
}

describe('Health water PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE water_entries, goals, user_settings, users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('stores multiple events, recalculates today, and preserves Analytics', async () => {
		const userId = await createUser('water-owner@example.com');
		const foreignUserId = await createUser('water-foreign@example.com');
		const auth = authorization(userId);
		const today = await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', auth)
			.expect(200);
		const date = today.body.data.date;
		const consumedAt = `${date}T12:00:00.000Z`;
		const ids = [];

		for (const amountMl of [250, 500, 750]) {
			const response = await request(app)
				.post('/api/v1/health/water')
				.set('Authorization', auth)
				.send({ amountMl, consumedAt })
				.expect(201);
			ids.push(response.body.data.entry.id);
		}

		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.amountMl).toBe(1500);
			});
		await request(app)
			.get(`/api/v1/health/water?from=${date}&to=${date}&page=1&pageSize=2`)
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(2);
				expect(response.body.meta).toMatchObject({ total: 3, totalPages: 2 });
			});

		await request(app)
			.patch(`/api/v1/health/water/${ids[0]}`)
			.set('Authorization', authorization(foreignUserId))
			.send({ amountMl: 400 })
			.expect(404);
		await request(app)
			.patch(`/api/v1/health/water/${ids[0]}`)
			.set('Authorization', auth)
			.send({ amountMl: 400 })
			.expect(200);
		await request(app)
			.delete(`/api/v1/health/water/${ids[1]}`)
			.set('Authorization', auth)
			.expect(200);
		await request(app)
			.get('/api/v1/water/today')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.amountMl).toBe(1150);
			});

		await request(app)
			.get(`/api/v1/analytics/summary?period=week&endDate=${date}`)
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.totalWaterMl).toBe(1150);
			});
	});

	test('returns compatible aggregates up to 20000 and cascades user deletion', async () => {
		const userId = await createUser('water-aggregate@example.com');
		const auth = authorization(userId);

		await request(app)
			.put('/api/v1/water/today')
			.set('Authorization', auth)
			.send({ amountMl: 12000 })
			.expect(200);
		await request(app)
			.get('/api/v1/health/water')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].amountMl).toBe(12000);
			});

		await pool.query('DELETE FROM users WHERE id = $1', [userId]);
		const remaining = await pool.query(
			'SELECT COUNT(*)::integer AS count FROM water_entries WHERE user_id = $1',
			[userId],
		);
		expect(remaining.rows[0].count).toBe(0);
	});
});
