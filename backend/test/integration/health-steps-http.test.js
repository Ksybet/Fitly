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

describe('Health steps PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE daily_tracking, user_settings, users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('returns owned chronological rows and preserves calories on upsert', async () => {
		const userId = await createUser('steps-owner@example.com');
		const foreignUserId = await createUser('steps-foreign@example.com');
		await pool.query(
			`INSERT INTO daily_tracking (
				user_id,
				tracking_date,
				steps,
				calories
			 ) VALUES
				($1, DATE '2026-08-02', 2000, 350.5),
				($1, DATE '2026-08-01', 1000, 200),
				($2, DATE '2026-08-02', 9999, 900)`,
			[userId, foreignUserId],
		);
		const auth = authorization(userId);

		await request(app)
			.get('/api/v1/health/steps?from=2026-08-01&to=2026-08-02')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(entry => entry.date))
					.toEqual(['2026-08-01', '2026-08-02']);
				expect(response.body.data.map(entry => entry.steps))
					.toEqual([1000, 2000]);
			});

		await request(app)
			.put('/api/v1/health/steps/2026-08-02')
			.set('Authorization', auth)
			.send({ steps: 4321 })
			.expect(200);
		const stored = await pool.query(
			`SELECT
				steps,
				calories::double precision AS calories
			 FROM daily_tracking
			 WHERE user_id = $1 AND tracking_date = DATE '2026-08-02'`,
			[userId],
		);
		expect(stored.rows).toEqual([{ steps: 4321, calories: 350.5 }]);

		await request(app)
			.get('/api/v1/analytics/activity?period=month&endDate=2026-08-31')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data.totalSteps).toBe(5321);
			});
	});
});
