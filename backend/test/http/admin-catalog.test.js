jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');

function authorization(role = 'admin') {
	return `Bearer ${jwt.sign(
		{ userId: 7, role },
		process.env.JWT_SECRET,
	)}`;
}

function exerciseRow(overrides = {}) {
	return {
		id: 12,
		title: 'Burpee',
		description: 'Full body exercise',
		type: 'cardio',
		bodyArea: 'full_body',
		intensity: 'high',
		instructions: ['Jump'],
		media: [],
		isActive: true,
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

const validExercise = {
	title: 'Burpee',
	description: 'Full body exercise',
	type: 'cardio',
	bodyArea: 'full_body',
	intensity: 'high',
	instructions: ['Jump'],
	media: [{ type: 'video', url: 'https://example.com/burpee.mp4' }],
};

describe('Admin exercise catalog HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the admin exercise catalog', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/exercises');
		if (token) {
			adminRequest.set('Authorization', token);
		}
		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('lists exercises with search, activity and pagination filters', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [exerciseRow({ isActive: false })] });

		await request(app)
			.get('/api/v1/admin/exercises?query=bur&active=false&page=2&pageSize=5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([
					expect.objectContaining({ id: 12, isActive: false }),
				]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				});
			});

		expect(pool.query.mock.calls[0][1]).toEqual(['%bur%', false]);
		expect(pool.query.mock.calls[1][1]).toEqual(['%bur%', false, 5, 5]);
	});

	test('gets an inactive exercise', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [exerciseRow({ isActive: false })],
		});

		await request(app)
			.get('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 12, isActive: false });
			});
	});

	test('creates an exercise from the documented request', async () => {
		pool.query.mockResolvedValueOnce({ rows: [exerciseRow()] });

		await request(app)
			.post('/api/v1/admin/exercises')
			.set('Authorization', authorization())
			.send(validExercise)
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 12, title: 'Burpee' });
			});
		expect(pool.query.mock.calls[0][1][5]).toBe('["Jump"]');
	});

	test('partially updates and restores an exercise', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [exerciseRow({ title: 'Burpee 2', isActive: true })],
		});

		await request(app)
			.patch('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.send({ title: 'Burpee 2', isActive: true })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					title: 'Burpee 2',
					isActive: true,
				});
			});
		expect(pool.query.mock.calls[0][0]).toContain('title = $2');
	});

	test('deactivates an exercise and returns the shared delete result', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ id: 12 }] });

		await request(app)
			.delete('/api/v1/admin/exercises/12')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
		expect(pool.query.mock.calls[0][0]).toContain('is_active = FALSE');
	});

	test('returns NOT_FOUND for an unknown exercise', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/admin/exercises/999')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
	});

	test.each([
		['get', '/api/v1/admin/exercises/not-an-id', undefined, 'exerciseId'],
		['get', '/api/v1/admin/exercises?active=yes', undefined, 'active'],
		['get', '/api/v1/admin/exercises?pageSize=101', undefined, 'pageSize'],
		['patch', '/api/v1/admin/exercises/12', {}, 'body'],
		['post', '/api/v1/admin/exercises', { ...validExercise, unknown: true }, 'unknown'],
		['post', '/api/v1/admin/exercises', { ...validExercise, title: '   ' }, 'title'],
		['post', '/api/v1/admin/exercises', { ...validExercise, type: 'pilates' }, 'type'],
		['post', '/api/v1/admin/exercises', { ...validExercise, instructions: [] }, 'instructions'],
		['post', '/api/v1/admin/exercises', {
			...validExercise,
			media: [{ type: 'audio', url: 'invalid' }],
		}, 'media[0].type'],
	])('rejects invalid input for %s %s', async (method, url, body, field) => {
		let adminRequest = request(app)[method](url)
			.set('Authorization', authorization());
		if (body !== undefined) {
			adminRequest = adminRequest.send(body);
		}
		await adminRequest
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([expect.objectContaining({ field })]),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});
});
