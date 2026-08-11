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

function foodProductRow(overrides = {}) {
	return {
		id: 15,
		name: 'Oatmeal',
		calories: '120.5',
		proteinG: '4.5',
		fatG: '3.2',
		carbsG: '19.7',
		isActive: true,
		source: 'system',
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

const validFoodProduct = {
	name: 'Oatmeal',
	nutritionPer100g: {
		calories: 120.5,
		proteinG: 4.5,
		fatG: 3.2,
		carbsG: 19.7,
	},
};

describe('Admin food catalog HTTP contracts', () => {
	beforeEach(() => jest.clearAllMocks());

	test.each([
		[undefined, 401],
		[authorization('user'), 403],
	])('protects the admin food catalog', async (token, status) => {
		const adminRequest = request(app).get('/api/v1/admin/food-products');
		if (token) {
			adminRequest.set('Authorization', token);
		}
		await adminRequest.expect(status);
		expect(pool.query).not.toHaveBeenCalled();
	});

	test('lists only system products with search, activity and pagination', async () => {
		pool.query
			.mockResolvedValueOnce({ rows: [{ total: 1 }] })
			.mockResolvedValueOnce({
				rows: [foodProductRow({ isActive: false })],
			});

		await request(app)
			.get('/api/v1/admin/food-products?query=oat&active=false&page=2&pageSize=5')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([
					expect.objectContaining({
						id: 15,
						isActive: false,
						source: 'system',
					}),
				]);
				expect(response.body.meta).toMatchObject({
					page: 2,
					pageSize: 5,
					total: 1,
					totalPages: 1,
				});
			});

		expect(pool.query.mock.calls[0][0]).toContain('owner_user_id IS NULL');
		expect(pool.query.mock.calls[0][1]).toEqual(['%oat%', false]);
		expect(pool.query.mock.calls[1][1]).toEqual(['%oat%', false, 5, 5]);
	});

	test('creates a normalized system product', async () => {
		pool.query.mockResolvedValueOnce({ rows: [foodProductRow()] });

		await request(app)
			.post('/api/v1/admin/food-products')
			.set('Authorization', authorization())
			.send({ ...validFoodProduct, name: '  Oatmeal  ' })
			.expect(201)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 15,
					name: 'Oatmeal',
					source: 'system',
				});
			});

		expect(pool.query.mock.calls[0][0]).toContain('VALUES (NULL');
		expect(pool.query.mock.calls[0][1]).toEqual([
			'Oatmeal',
			120.5,
			4.5,
			3.2,
			19.7,
			true,
		]);
	});

	test('gets an inactive system product', async () => {
		pool.query.mockResolvedValueOnce({
			rows: [foodProductRow({ isActive: false })],
		});

		await request(app)
			.get('/api/v1/admin/food-products/15')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 15, isActive: false });
			});
		expect(pool.query.mock.calls[0][0]).toContain('owner_user_id IS NULL');
	});

	test('partially updates and restores a system product', async () => {
		pool.query.mockResolvedValueOnce({ rows: [foodProductRow()] });

		await request(app)
			.patch('/api/v1/admin/food-products/15')
			.set('Authorization', authorization())
			.send({ isActive: true })
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({ id: 15, isActive: true });
			});
		expect(pool.query.mock.calls[0][0]).toContain('is_active = $2');
		expect(pool.query.mock.calls[0][0]).toContain('owner_user_id IS NULL');
		expect(pool.query.mock.calls[0][1]).toEqual([15, true]);
	});

	test('deactivates a system product with the shared delete result', async () => {
		pool.query.mockResolvedValueOnce({ rows: [{ id: 15 }] });

		await request(app)
			.delete('/api/v1/admin/food-products/15')
			.set('Authorization', authorization())
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual({ deleted: true });
			});
		expect(pool.query.mock.calls[0][0]).toContain('is_active = FALSE');
		expect(pool.query.mock.calls[0][0]).toContain('owner_user_id IS NULL');
	});

	test('returns NOT_FOUND when a product is not a system product', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await request(app)
			.get('/api/v1/admin/food-products/999')
			.set('Authorization', authorization())
			.expect(404)
			.expect(response => {
				expect(response.body.error.code).toBe('NOT_FOUND');
			});
	});

	test.each([
		['get', '/api/v1/admin/food-products?active=yes', undefined, 'active'],
		['get', '/api/v1/admin/food-products?page=0', undefined, 'page'],
		['get', '/api/v1/admin/food-products?unknown=true', undefined, 'unknown'],
		['get', '/api/v1/admin/food-products/not-an-id', undefined, 'productId'],
		['patch', '/api/v1/admin/food-products/15', {}, 'body'],
		['post', '/api/v1/admin/food-products', {
			...validFoodProduct,
			unknown: true,
		}, 'unknown'],
		['post', '/api/v1/admin/food-products', {
			...validFoodProduct,
			name: '   ',
		}, 'name'],
		['post', '/api/v1/admin/food-products', {
			...validFoodProduct,
			nutritionPer100g: {
				...validFoodProduct.nutritionPer100g,
				calories: -1,
			},
		}, 'nutritionPer100g.calories'],
		['patch', '/api/v1/admin/food-products/15', {
			nutritionPer100g: { calories: 100 },
		}, 'nutritionPer100g.proteinG'],
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
