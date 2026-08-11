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
		 VALUES ($1, 'hash')
		 RETURNING id`,
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

describe('Health weight PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				weight_entries,
				profiles,
				user_settings,
				users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('supports ownership, filtering, pagination, conflicts, Profile, and Analytics', async () => {
		const userId = await createUser('weight-owner@example.com');
		const foreignUserId = await createUser('weight-foreign@example.com');
		await pool.query(
			'INSERT INTO profiles (user_id, height_cm) VALUES ($1, 180)',
			[userId],
		);
		const auth = authorization(userId);

		const first = await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', auth)
			.send({ date: '2026-08-01', weightKg: 80 })
			.expect(201);
		const second = await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', auth)
			.send({ date: '2026-08-10', weightKg: 78 })
			.expect(201);
		await request(app)
			.post('/api/v1/health/weight')
			.set('Authorization', auth)
			.send({ date: '2026-08-10', weightKg: 77 })
			.expect(409);

		await request(app)
			.get('/api/v1/health/weight?from=2026-08-01&to=2026-08-31&page=1&pageSize=1')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].id).toBe(second.body.data.id);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 1,
					total: 2,
					totalPages: 2,
				});
			});

		await request(app)
			.get(`/api/v1/health/weight/${second.body.data.id}`)
			.set('Authorization', authorization(foreignUserId))
			.expect(404);
		await request(app)
			.patch(`/api/v1/health/weight/${first.body.data.id}`)
			.set('Authorization', auth)
			.send({ date: '2026-08-10', weightKg: 79 })
			.expect(409);

		await request(app)
			.get('/api/v1/profile')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.weightKg).toBe(78);
			});
		await request(app)
			.get('/api/v1/analytics/weight?period=month&endDate=2026-08-31')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.currentWeightKg).toBe(78);
				expect(response.body.data.points).toHaveLength(2);
			});

		await request(app)
			.delete(`/api/v1/health/weight/${second.body.data.id}`)
			.set('Authorization', auth)
			.expect(200);
		await request(app)
			.get('/api/v1/profile')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.weightKg).toBe(80);
			});
	});
});
