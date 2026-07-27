const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

const requestIdPattern = /^req_[0-9a-f]{32}$/;

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

async function createUser() {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash)
		 VALUES ($1, $2)
		 RETURNING id`,
		['goals@example.com', 'hash'],
	);

	return result.rows[0].id;
}

describe('Goals and system PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query('TRUNCATE TABLE goals, users RESTART IDENTITY CASCADE');
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('reports a healthy database through the system endpoint', async () => {
		await request(app)
			.get('/health')
			.expect(200)
			.expect(response => {
				expect(response.body).toMatchObject({
					success: true,
					data: {
						status: 'ok',
						database: 'ok',
						timestamp: expect.any(String),
					},
					meta: {
						requestId: expect.stringMatching(requestIdPattern),
					},
				});
			});
	});

	test('replaces goals, preserves cancelled history, and returns Goal DTOs', async () => {
		const userId = await createUser();
		const token = authorization(userId);
		const sqlLikeTitle = "Walk'; DROP TABLE users; --";

		await request(app)
			.put('/api/v1/goals')
			.set('Authorization', token)
			.send({
				goals: [{
					goalType: 'steps',
					title: sqlLikeTitle,
					targetValue: 5000.5,
					unit: 'steps',
				}],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data.goals).toEqual([
					expect.objectContaining({
						id: 1,
						goalType: 'steps',
						title: sqlLikeTitle,
						targetValue: 5000.5,
						unit: 'steps',
						status: 'created',
						currentValue: null,
						progressPercent: 0,
						createdAt: expect.any(String),
						completedAt: null,
					}),
				]);
				expect(response.body.data.goals[0]).not.toHaveProperty('userId');
				expect(response.body.data.goals[0]).not.toHaveProperty('updatedAt');
			});

		await request(app)
			.put('/api/v1/goals')
			.set('Authorization', token)
			.send({
				goals: [{
					goalType: 'water',
					title: 'Drink water',
					targetValue: 2000,
					unit: 'ml',
					startsOn: '2026-07-26',
					endsOn: null,
				}],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data.goals).toEqual(expect.arrayContaining([
					expect.objectContaining({
						goalType: 'water',
						status: 'created',
						startsOn: '2026-07-26',
					}),
					expect.objectContaining({
						goalType: 'steps',
						status: 'cancelled',
					}),
				]));
			});

		await request(app)
			.get('/api/v1/goals')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.goals).toHaveLength(2);
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});

		const tableCheck = await pool.query("SELECT to_regclass('public.users') AS name");
		expect(tableCheck.rows[0].name).toBe('users');
	});

	test('enforces contract constraints for persisted goals', async () => {
		const userId = await createUser();

		await expect(pool.query(
			`INSERT INTO goals (
				user_id, goal_type, title, target_value, unit, status
			 )
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[userId, 'invalid', 'Goal', 1, 'custom', 'created'],
		)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO goals (
				user_id, goal_type, title, target_value, unit, status
			 )
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[userId, 'custom', 'Goal', -1, 'custom', 'created'],
		)).rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO goals (
				user_id, goal_type, title, target_value, unit, progress_percent
			 )
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[userId, 'custom', 'Goal', 1, 'custom', 101],
		)).rejects.toMatchObject({ code: '23514' });
	});
});
