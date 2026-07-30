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
const nutritionService = require('../../src/modules/nutrition/nutrition.service');
const { ApiError } = require('../../src/utils/api-error');

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

function mealDto(overrides = {}) {
	return {
		id: 4,
		mealType: 'breakfast',
		eatenAt: '2026-07-29T21:30:00.000Z',
		date: '2026-07-30',
		title: 'Breakfast',
		items: [{
			id: 10,
			productId: 1,
			name: 'Apple',
			amountG: 150,
			nutritionPer100g: {
				calories: 52,
				proteinG: 0.3,
				fatG: 0.2,
				carbsG: 14,
			},
			nutritionTotal: {
				calories: 78,
				proteinG: 0.45,
				fatG: 0.3,
				carbsG: 21,
			},
		}],
		nutritionTotal: {
			calories: 78,
			proteinG: 0.45,
			fatG: 0.3,
			carbsG: 21,
		},
		createdAt: '2026-07-30T08:00:00.000Z',
		updatedAt: '2026-07-30T08:00:00.000Z',
		...overrides,
	};
}

describe('Nutrition product HTTP contracts', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

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

describe('Nutrition meal HTTP contracts', () => {
	const validBody = {
		mealType: 'breakfast',
		eatenAt: '2026-07-29T21:30:00Z',
		title: 'Breakfast',
		items: [
			{ productId: 1, amountG: 150 },
			{
				name: 'Yogurt',
				amountG: 80,
				nutritionPer100g: {
					calories: 100,
					proteinG: 5,
					fatG: 2,
					carbsG: 10,
				},
			},
		],
	};

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	test('lists meals with validated filters and pagination', async () => {
		jest.spyOn(nutritionService, 'listMeals').mockResolvedValueOnce({
			items: [mealDto()],
			meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
		});

		await request(app)
			.get('/api/v1/nutrition/meals?from=2026-07-30&to=2026-07-30&mealType=breakfast&pageSize=10')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([mealDto()]);
				expect(response.body.meta).toEqual({
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
					requestId: expect.stringMatching(requestIdPattern),
				});
			});
		expect(nutritionService.listMeals).toHaveBeenCalledWith(1, {
			from: '2026-07-30',
			to: '2026-07-30',
			mealType: 'breakfast',
			page: 1,
			pageSize: 10,
		});
	});

	test('creates, reads, replaces and deletes a meal', async () => {
		const updatedMeal = mealDto({ mealType: 'lunch', title: null });
		jest.spyOn(nutritionService, 'createMeal')
			.mockResolvedValueOnce(mealDto());
		jest.spyOn(nutritionService, 'getMeal')
			.mockResolvedValueOnce(mealDto());
		jest.spyOn(nutritionService, 'updateMeal')
			.mockResolvedValueOnce(updatedMeal);
		jest.spyOn(nutritionService, 'deleteMeal')
			.mockResolvedValueOnce();

		await request(app)
			.post('/api/v1/nutrition/meals')
			.set('Authorization', authorization())
			.send(validBody)
			.expect(201)
			.expect(response => {
				expect(response.body.data).toEqual(mealDto());
			});

		await request(app)
			.get('/api/v1/nutrition/meals/4')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual(mealDto());
			});

		const replacement = {
			mealType: 'lunch',
			eatenAt: validBody.eatenAt,
			items: [{ productId: 1, amountG: 100 }],
		};
		await request(app)
			.patch('/api/v1/nutrition/meals/4')
			.set('Authorization', authorization())
			.send(replacement)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual(updatedMeal);
			});
		expect(nutritionService.updateMeal).toHaveBeenCalledWith(1, 4, {
			...replacement,
			title: null,
		});

		await request(app)
			.delete('/api/v1/nutrition/meals/4')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
	});

	test('returns item-level validation for an unavailable product', async () => {
		jest.spyOn(nutritionService, 'createMeal').mockRejectedValueOnce(
			new ApiError(400, 'Request validation failed', {
				details: [{
					field: 'items[0].productId',
					code: 'UNAVAILABLE_PRODUCT',
					message: 'Product is unavailable',
				}],
			}),
		);

		await request(app)
			.post('/api/v1/nutrition/meals')
			.set('Authorization', authorization())
			.send({
				mealType: 'lunch',
				eatenAt: '2026-07-30T12:00:00Z',
				items: [{ productId: 99, amountG: 100 }],
			})
			.expect(400)
			.expect(response => {
				expect(response.body.error.details).toEqual([
					expect.objectContaining({
						field: 'items[0].productId',
						code: 'UNAVAILABLE_PRODUCT',
					}),
				]);
			});
	});

	test.each([
		['/api/v1/nutrition/meals?from=2026-02-30', 'from', 'INVALID_DATE'],
		['/api/v1/nutrition/meals?from=2026-08-01&to=2026-07-30', 'to', 'INVALID_RANGE'],
		['/api/v1/nutrition/meals?mealType=brunch', 'mealType', 'INVALID_ENUM'],
		['/api/v1/nutrition/meals/not-an-id', 'mealId', 'OUT_OF_RANGE'],
	])('rejects an invalid meal query or path %s', async (url, field, code) => {
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
		[{}, 'mealType', 'REQUIRED'],
		[{
			...validBody,
			eatenAt: '2026-07-30',
		}, 'eatenAt', 'INVALID_DATE_TIME'],
		[{
			...validBody,
			items: [{
				productId: 1,
				name: 'Mixed',
				amountG: 100,
				nutritionPer100g: {
					calories: 1,
					proteinG: 1,
					fatG: 1,
					carbsG: 1,
				},
			}],
		}, 'items[0]', 'ONE_OF'],
		[{
			...validBody,
			items: [{ productId: 1, amountG: 0 }],
		}, 'items[0].amountG', 'OUT_OF_RANGE'],
		[{
			...validBody,
			items: [{
				name: 'Manual',
				amountG: 100,
				nutritionPer100g: {
					calories: 1,
					proteinG: 1,
					fatG: 1,
				},
			}],
		}, 'items[0].nutritionPer100g.carbsG', 'REQUIRED'],
	])('rejects an invalid MealEntryRequest', async (body, field, code) => {
		await request(app)
			.post('/api/v1/nutrition/meals')
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

	test.each([
		['get', '/api/v1/nutrition/meals'],
		['post', '/api/v1/nutrition/meals'],
		['get', '/api/v1/nutrition/meals/1'],
		['patch', '/api/v1/nutrition/meals/1'],
		['delete', '/api/v1/nutrition/meals/1'],
	])('%s %s requires authentication', async (method, url) => {
		await request(app)[method](url)
			.send(validBody)
			.expect(401);
	});
});
