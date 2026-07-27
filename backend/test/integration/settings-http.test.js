const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const tables = [
	'auth_sessions',
	'user_settings',
	'profiles',
	'users',
];

function authorization(userId) {
	const token = jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	);
	return `Bearer ${token}`;
}

describe('Settings PostgreSQL contracts', () => {
	let auth;

	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		if (!result.rows[0].name.endsWith('_test')) {
			throw new Error(`Integration tests refuse to use: ${result.rows[0].name}`);
		}
	});

	beforeEach(async () => {
		await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
		const result = await pool.query(
			`INSERT INTO users (email, password_hash, role, is_active)
			 VALUES ($1, $2, 'user', TRUE)
			 RETURNING id`,
			['settings@example.com', 'not-used'],
		);
		auth = authorization(result.rows[0].id);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates defaults lazily and merges partial settings updates', async () => {
		await request(app)
			.get('/api/v1/settings')
			.set('Authorization', auth)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					theme: 'system',
					language: 'ru',
					timezone: 'UTC',
					quickAction: 'water',
					aiEnabled: false,
					notifications: {},
				});
			});

		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', auth)
			.send({
				timezone: 'America/Los_Angeles',
				notifications: {
					enabled: true,
					waterEnabled: true,
				},
			})
			.expect(200);

		await request(app)
			.patch('/api/v1/settings')
			.set('Authorization', auth)
			.send({
				notifications: { waterEnabled: false },
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					timezone: 'America/Los_Angeles',
					notifications: {
						enabled: true,
						waterEnabled: false,
					},
				});
			});

		const result = await pool.query(
			`SELECT timezone, notifications
			 FROM user_settings`,
		);
		expect(result.rows).toEqual([{
			timezone: 'America/Los_Angeles',
			notifications: {
				enabled: true,
				waterEnabled: false,
			},
		}]);
	});
});
