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
		 VALUES ($1, $2)
		 RETURNING id`,
		[email, 'hash'],
	);

	return result.rows[0].id;
}

async function createSystemProduct(name, isActive = true) {
	const result = await pool.query(
		`INSERT INTO food_products (
			name,
			calories_per_100g,
			protein_g_per_100g,
			fat_g_per_100g,
			carbs_g_per_100g,
			is_active
		 )
		 VALUES ($1, 52, 0.3, 0.2, 14, $2)
		 RETURNING id`,
		[name, isActive],
	);

	return result.rows[0].id;
}

describe('Nutrition PostgreSQL HTTP contracts', () => {
	beforeAll(async () => {
		const result = await pool.query('SELECT current_database() AS name');
		expectTestDatabase(result.rows[0].name);
	});

	beforeEach(async () => {
		await pool.query(
			`TRUNCATE TABLE
				meal_items,
				meal_entries,
				food_products,
				users
			 RESTART IDENTITY CASCADE`,
		);
	});

	afterAll(async () => {
		await closeDatabase();
	});

	test('searches active system and owned custom products with isolation', async () => {
		const firstUserId = await createUser('nutrition-first@example.com');
		const secondUserId = await createUser('nutrition-second@example.com');
		await createSystemProduct('Apple');
		await createSystemProduct('Inactive apple', false);

		await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', authorization(firstUserId))
			.send({
				name: 'Apple pie',
				nutritionPer100g: {
					calories: 237,
					proteinG: 2.4,
					fatG: 11,
					carbsG: 34,
				},
			})
			.expect(201);
		await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', authorization(secondUserId))
			.send({
				name: 'Private apple',
				nutritionPer100g: {
					calories: 100,
					proteinG: 1,
					fatG: 1,
					carbsG: 20,
				},
			})
			.expect(201);

		await request(app)
			.get('/api/v1/nutrition/products?query=APPLE&pageSize=1')
			.set('Authorization', authorization(firstUserId))
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].name).toBe('Apple');
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 1,
					total: 2,
					totalPages: 2,
				});
			});

		await request(app)
			.get('/api/v1/nutrition/products?query=apple&scope=custom')
			.set('Authorization', authorization(firstUserId))
			.expect(200)
			.expect(response => {
				expect(response.body.data.map(product => product.name))
					.toEqual(['Apple pie']);
				expect(response.body.data[0].source).toBe('custom');
			});
	});

	test('database rejects blank names and negative nutrition values', async () => {
		await expect(createSystemProduct(' '))
			.rejects.toMatchObject({ code: '23514' });

		await expect(pool.query(
			`INSERT INTO food_products (
				name,
				calories_per_100g,
				protein_g_per_100g,
				fat_g_per_100g,
				carbs_g_per_100g
			 )
			 VALUES ('Invalid', -1, 0, 0, 0)`,
		)).rejects.toMatchObject({ code: '23514' });
	});

	test('creates, filters, snapshots, replaces and deletes a meal', async () => {
		const userId = await createUser('meal-owner@example.com');
		const otherUserId = await createUser('meal-other@example.com');
		await pool.query(
			`INSERT INTO user_settings (user_id, timezone)
			 VALUES ($1, 'Europe/Moscow')`,
			[userId],
		);
		const appleId = await createSystemProduct('Apple');
		const token = authorization(userId);
		const createResponse = await request(app)
			.post('/api/v1/nutrition/meals')
			.set('Authorization', token)
			.send({
				mealType: 'breakfast',
				eatenAt: '2026-07-29T21:30:00Z',
				title: 'Morning meal',
				items: [
					{ productId: appleId, amountG: 150 },
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
			})
			.expect(201);

		expect(createResponse.body.data).toMatchObject({
			id: 1,
			mealType: 'breakfast',
			eatenAt: '2026-07-29T21:30:00.000Z',
			date: '2026-07-30',
			title: 'Morning meal',
			items: [
				{
					productId: appleId,
					name: 'Apple',
					amountG: 150,
					nutritionTotal: {
						calories: 78,
						proteinG: 0.45,
						fatG: 0.3,
						carbsG: 21,
					},
				},
				{
					productId: null,
					name: 'Yogurt',
					amountG: 80,
					nutritionTotal: {
						calories: 80,
						proteinG: 4,
						fatG: 1.6,
						carbsG: 8,
					},
				},
			],
			nutritionTotal: {
				calories: 158,
				proteinG: 4.45,
				fatG: 1.9,
				carbsG: 29,
			},
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});

		await request(app)
			.get('/api/v1/nutrition/meals?from=2026-07-30&to=2026-07-30&mealType=breakfast')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toHaveLength(1);
				expect(response.body.data[0].id).toBe(1);
				expect(response.body.meta).toMatchObject({
					page: 1,
					pageSize: 20,
					total: 1,
					totalPages: 1,
				});
			});

		await request(app)
			.get('/api/v1/nutrition/meals?to=2026-07-29')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([]);
				expect(response.body.meta.totalPages).toBe(0);
			});

		const originalCreatedAt = createResponse.body.data.createdAt;
		await request(app)
			.patch('/api/v1/nutrition/meals/1')
			.set('Authorization', token)
			.send({
				mealType: 'lunch',
				eatenAt: '2026-07-30T10:00:00Z',
				items: [{ productId: appleId, amountG: 100 }],
			})
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					id: 1,
					mealType: 'lunch',
					date: '2026-07-30',
					title: null,
					nutritionTotal: {
						calories: 52,
						proteinG: 0.3,
						fatG: 0.2,
						carbsG: 14,
					},
					createdAt: originalCreatedAt,
				});
				expect(response.body.data.items).toHaveLength(1);
			});

		await pool.query(
			`UPDATE food_products
			 SET name = 'Changed apple',
			     calories_per_100g = 999,
			     is_active = FALSE
			 WHERE id = $1`,
			[appleId],
		);
		await request(app)
			.get('/api/v1/nutrition/meals/1')
			.set('Authorization', token)
			.expect(200)
			.expect(response => {
				expect(response.body.data.items[0]).toMatchObject({
					name: 'Apple',
					nutritionPer100g: { calories: 52 },
					nutritionTotal: { calories: 52 },
				});
			});

		for (const method of ['get', 'delete']) {
			await request(app)[method]('/api/v1/nutrition/meals/1')
				.set('Authorization', authorization(otherUserId))
				.expect(404);
		}
		await request(app)
			.patch('/api/v1/nutrition/meals/1')
			.set('Authorization', authorization(otherUserId))
			.send({
				mealType: 'dinner',
				eatenAt: '2026-07-30T18:00:00Z',
				items: [{
					name: 'Manual',
					amountG: 100,
					nutritionPer100g: {
						calories: 1,
						proteinG: 1,
						fatG: 1,
						carbsG: 1,
					},
				}],
			})
			.expect(404);

		await request(app)
			.delete('/api/v1/nutrition/meals/1')
			.set('Authorization', token)
			.expect(200);
		await request(app)
			.get('/api/v1/nutrition/meals/1')
			.set('Authorization', token)
			.expect(404);

		const itemCount = await pool.query(
			'SELECT COUNT(*)::integer AS count FROM meal_items',
		);
		expect(itemCount.rows[0].count).toBe(0);
	});

	test('rejects inaccessible products without creating or replacing data', async () => {
		const ownerId = await createUser('product-owner@example.com');
		const mealOwnerId = await createUser('meal-product-user@example.com');
		const customResponse = await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', authorization(ownerId))
			.send({
				name: 'Private product',
				nutritionPer100g: {
					calories: 10,
					proteinG: 1,
					fatG: 1,
					carbsG: 1,
				},
			})
			.expect(201);

		await request(app)
			.post('/api/v1/nutrition/meals')
			.set('Authorization', authorization(mealOwnerId))
			.send({
				mealType: 'snack',
				eatenAt: '2026-07-30T12:00:00Z',
				items: [{
					productId: customResponse.body.data.id,
					amountG: 100,
				}],
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

		const mealCount = await pool.query(
			'SELECT COUNT(*)::integer AS count FROM meal_entries',
		);
		expect(mealCount.rows[0].count).toBe(0);
	});

	test('database enforces meal types and item amount ranges', async () => {
		const userId = await createUser('meal-constraints@example.com');

		await expect(pool.query(
			`INSERT INTO meal_entries (user_id, meal_type, eaten_at)
			 VALUES ($1, 'brunch', CURRENT_TIMESTAMP)`,
			[userId],
		)).rejects.toMatchObject({ code: '23514' });

		const mealResult = await pool.query(
			`INSERT INTO meal_entries (user_id, meal_type, eaten_at)
			 VALUES ($1, 'breakfast', CURRENT_TIMESTAMP)
			 RETURNING id`,
			[userId],
		);
		await expect(pool.query(
			`INSERT INTO meal_items (
				meal_entry_id,
				name,
				amount_g,
				calories_per_100g,
				protein_g_per_100g,
				fat_g_per_100g,
				carbs_g_per_100g,
				total_calories,
				total_protein_g,
				total_fat_g,
				total_carbs_g
			 )
			 VALUES ($1, 'Invalid', 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
			[mealResult.rows[0].id],
		)).rejects.toMatchObject({ code: '23514' });
	});
});
