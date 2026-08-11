const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool, closeDatabase } = require('../../src/config/db');

function expectTestDatabase(databaseName) {
	if (!databaseName.endsWith('_test')) {
		throw new Error(
			`Integration tests refuse to use non-test database: ${databaseName}`,
		);
	}
}

function authorization(role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId: 1, role },
		process.env.JWT_SECRET,
	)}`;
}

const exerciseRequest = {
	title: 'Integration burpee',
	description: 'Full body integration exercise',
	type: 'cardio',
	bodyArea: 'full_body',
	intensity: 'high',
	instructions: ['Jump', 'Land softly'],
	media: [{ type: 'video', url: 'https://example.com/burpee.mp4' }],
};

describe('Admin catalog PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query('DELETE FROM exercises WHERE id > 11');
		await pool.query('UPDATE exercises SET is_active = TRUE WHERE id <= 11');
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('creates, lists, updates, deactivates and restores an exercise', async () => {
		const created = await request(app)
			.post('/api/v1/admin/exercises')
			.set('Authorization', authorization())
			.send(exerciseRequest)
			.expect(201);
		const exerciseId = created.body.data.id;

		const listed = await request(app)
			.get('/api/v1/admin/exercises?query=integration&active=true')
			.set('Authorization', authorization())
			.expect(200);
		expect(listed.body.data.map(exercise => exercise.id)).toContain(exerciseId);

		await request(app)
			.patch(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.send({ title: 'Updated integration burpee' })
			.expect(200)
			.expect(response => {
				expect(response.body.data.title).toBe('Updated integration burpee');
			});

		await request(app)
			.delete(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200);
		await request(app)
			.delete(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200);

		await request(app)
			.get(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(false));

		await request(app)
			.patch(`/api/v1/admin/exercises/${exerciseId}`)
			.set('Authorization', authorization())
			.send({ isActive: true })
			.expect(200)
			.expect(response => expect(response.body.data.isActive).toBe(true));
	});

	test('deactivating a referenced exercise preserves workout relationships', async () => {
		const before = await pool.query(
			'SELECT COUNT(*)::integer AS total FROM workout_exercises WHERE exercise_id = 1',
		);

		await request(app)
			.delete('/api/v1/admin/exercises/1')
			.set('Authorization', authorization())
			.expect(200);

		const after = await pool.query(
			`SELECT
				(SELECT COUNT(*)::integer FROM workout_exercises WHERE exercise_id = 1) AS relationships,
				(SELECT is_active FROM workouts WHERE id = 1) AS workout_active`,
		);
		expect(after.rows[0]).toEqual({
			relationships: before.rows[0].total,
			workout_active: true,
		});
	});
});
