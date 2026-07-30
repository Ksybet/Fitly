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

function authorization(userId = 1) {
	return `Bearer ${jwt.sign(
		{ userId, role: 'user' },
		process.env.JWT_SECRET,
	)}`;
}

function productRow(overrides = {}) {
	return {
		id: 1,
		name: 'Apple',
		calories: '52',
		proteinG: '0.3',
		fatG: '0.2',
		carbsG: '14',
		isActive: true,
		source: 'system',
		createdAt: new Date('2026-07-30T10:00:00.000Z'),
		updatedAt: new Date('2026-07-30T10:00:00.000Z'),
		...overrides,
	};
}

describe('Nutrition product HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test('GET /nutrition/products returns accessible paginated products', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({ rows: [productRow()] });

		await request(app)
			.get('/api/v1/nutrition/products?query=app&scope=all&page=1&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body).toEqual({
					success: true,
					data: [{
						id: 1,
						name: 'Apple',
						nutritionPer100g: {
							calories: 52,
							proteinG: 0.3,
							fatG: 0.2,
							carbsG: 14,
						},
						isActive: true,
						source: 'system',
						createdAt: '2026-07-30T10:00:00.000Z',
						updatedAt: '2026-07-30T10:00:00.000Z',
					}],
					meta: {
						page: 1,
						pageSize: 10,
						total: 1,
						totalPages: 1,
						requestId: expect.stringMatching(requestIdPattern),
					},
				});
			});
		expect(pool.query.mock.calls[0][1]).toEqual([1, '%app%']);
		expect(pool.query.mock.calls[1][1]).toEqual([1, '%app%', 10, 0]);
	});

	test('POST /nutrition/products creates a normalized custom product', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [productRow({
				id: 2,
				name: 'Oatmeal',
				calories: '370',
				proteinG: '13',
				fatG: '7',
				carbsG: '62',
				source: 'custom',
			})],
		});

		await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', authorization())
			.send({
				name: '  Oatmeal  ',
				nutritionPer100g: {
					calories: 370,
					proteinG: 13,
					fatG: 7,
					carbsG: 62,
				},
			})
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 2,
					name: 'Oatmeal',
					source: 'custom',
					isActive: true,
				});
				expect(response.body.meta.requestId).toMatch(requestIdPattern);
			});

		expect(pool.query.mock.calls[0][1]).toEqual([
			1,
			'Oatmeal',
			370,
			13,
			7,
			62,
			true,
		]);
	});

	test.each([
		['/api/v1/nutrition/products?page=0', 'page', 'OUT_OF_RANGE'],
		['/api/v1/nutrition/products?pageSize=101', 'pageSize', 'OUT_OF_RANGE'],
		['/api/v1/nutrition/products?scope=private', 'scope', 'INVALID_ENUM'],
		['/api/v1/nutrition/products?unknown=true', 'unknown', 'UNKNOWN_FIELD'],
	])('rejects invalid product search query %s', async (url, field, code) => {
		await request(app)
			.get(url)
			.set('Authorization', authorization())
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field, code }),
				]));
			});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test.each([
		[{}, 'name', 'REQUIRED'],
		[{
			name: ' ',
			nutritionPer100g: {
				calories: 1,
				proteinG: 1,
				fatG: 1,
				carbsG: 1,
			},
		}, 'name', 'INVALID_LENGTH'],
		[{
			name: 'Product',
			nutritionPer100g: {
				calories: -1,
				proteinG: 1,
				fatG: 1,
				carbsG: 1,
			},
		}, 'nutritionPer100g.calories', 'OUT_OF_RANGE'],
		[{
			name: 'Product',
			nutritionPer100g: {
				calories: 1,
				proteinG: 1,
				fatG: 1,
			},
		}, 'nutritionPer100g.carbsG', 'REQUIRED'],
	])('rejects an invalid product body', async (body, field, code) => {
		await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', authorization())
			.send(body)
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual(expect.arrayContaining([
					expect.objectContaining({ field, code }),
				]));
			});
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('product endpoints require authentication', async () => {
		await request(app)
			.get('/api/v1/nutrition/products')
			.expect(401);
		await request(app)
			.post('/api/v1/nutrition/products')
			.send({})
			.expect(401);
		expect(pool.query).not.toHaveBeenCalled();
	});
});
