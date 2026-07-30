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

const requestIdPattern = /^req_[0-9a-f]{32}$/;

function authorization() {
	return `Bearer ${jwt.sign(
		{ userId: 1, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function workoutRow(overrides = {}) {
	return {
		id: 1,
		title: 'Силовая для рук',
		description: 'Описание',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		durationMinutes: 25,
		estimatedCalories: '220.00',
		imageUrl: null,
		isActive: true,
		createdAt: new Date('2026-07-31T08:00:00.000Z'),
		updatedAt: new Date('2026-07-31T09:00:00.000Z'),
		...overrides,
	};
}

function exerciseRow(overrides = {}) {
	return {
		exerciseId: 1,
		sortOrder: 1,
		sets: 3,
		repetitions: 10,
		durationSeconds: null,
		restSeconds: null,
		id: 1,
		title: 'Отжимания',
		description: 'Описание упражнения',
		type: 'strength',
		bodyArea: 'arms',
		intensity: 'medium',
		instructions: ['Держите корпус ровно.'],
		media: [],
		isActive: true,
		createdAt: new Date('2026-07-31T08:00:00.000Z'),
		updatedAt: new Date('2026-07-31T09:00:00.000Z'),
		...overrides,
	};
}

describe('Workout catalog HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('returns filtered paginated active workouts', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [workoutRow()] });

		await request(app)
			.get(
				'/api/v1/workouts/catalog?type=strength&bodyArea=arms'
				+ '&intensity=medium&maxDurationMinutes=30&page=2&pageSize=5',
			)
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toEqual({
					success: true,
					data: [{
						id: 1,
						title: 'Силовая для рук',
						description: 'Описание',
						type: 'strength',
						bodyArea: 'arms',
						intensity: 'medium',
						durationMinutes: 25,
						estimatedCalories: 220,
						imageUrl: null,
						isActive: true,
					}],
					meta: {
						page: 2,
						pageSize: 5,
						total: 1,
						totalPages: 1,
						requestId: expect.stringMatching(requestIdPattern),
					},
				});
			});

		expect(pool.query.mock.calls[0][1])
			.toEqual(['strength', 'arms', 'medium', 30]);
		expect(pool.query.mock.calls[1][1])
			.toEqual(['strength', 'arms', 'medium', 30, 5, 5]);
		expect(pool.query.mock.calls[1][0]).toContain('is_active = TRUE');
	});

	test('returns an empty first page with default pagination', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 0 }] })
			.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/workouts/catalog')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([]);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 20,
					total: 0,
					totalPages: 0,
				});
			});
	});

	test('returns workout details with sorted exercises', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [workoutRow()] })
			.mockResolvedValueOnce({
				rows: [
					exerciseRow({ exerciseId: 2, id: 2, sortOrder: 2 }),
					exerciseRow(),
				],
			});

		await request(app)
			.get('/api/v1/workouts/catalog/1')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data.exercises.map(item => item.exerciseId))
					.toEqual([1, 2]);
				expect(response.body.data.exercises[0]).toMatchObject({
					exerciseId: 1,
					order: 1,
					sets: 3,
					repetitions: 10,
					exercise: {
						title: 'Отжимания',
						instructions: ['Держите корпус ровно.'],
					},
				});
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});
		expect(pool.query.mock.calls[0][1]).toEqual([1]);
		expect(pool.query.mock.calls[1][1]).toEqual([1]);
	});

	test('returns NOT_FOUND for a missing or inactive workout', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/workouts/catalog/99')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error).toMatchObject({
					code: 'NOT_FOUND',
					requestId: expect.stringMatching(requestIdPattern),
				});
			});
		expect(pool.query).toHaveBeenCalledTimes(1);
	});

	test.each([
		['/api/v1/workouts/catalog?type=pilates', 'type', 'INVALID_ENUM'],
		['/api/v1/workouts/catalog?bodyArea=press', 'bodyArea', 'INVALID_ENUM'],
		['/api/v1/workouts/catalog?intensity=extreme', 'intensity', 'INVALID_ENUM'],
		[
			'/api/v1/workouts/catalog?maxDurationMinutes=4',
			'maxDurationMinutes',
			'OUT_OF_RANGE',
		],
		['/api/v1/workouts/catalog?page=0', 'page', 'OUT_OF_RANGE'],
		['/api/v1/workouts/catalog?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
		['/api/v1/workouts/catalog?isActive=true', 'isActive', 'UNKNOWN_FIELD'],
		['/api/v1/workouts/catalog/not-an-id', 'workoutId', 'OUT_OF_RANGE'],
	])('rejects invalid catalog input %s', async (url, field, code) => {
		await request(app)
			.get(url)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ field, code }),
					]),
				);
			});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test.each([
		'/api/v1/workouts/catalog',
		'/api/v1/workouts/catalog/1',
	])('%s requires authentication', async url => {
		await request(app).get(url).expect(401);
		expect(pool.query).not.toHaveBeenCalled();
	});
});
