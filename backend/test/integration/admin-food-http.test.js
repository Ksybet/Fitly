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

function authorization(userId, role = 'user') {
	return `Bearer ${jwt.sign(
		{ userId, role },
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
	const userId = result.rows[0].id;
	await pool.query(
		`INSERT INTO user_settings (user_id, timezone)
		 VALUES ($1, 'UTC')`,
		[userId],
	);
	return userId;
}

const systemProductRequest = {
	name: 'Integration oatmeal',
	nutritionPer100g: {
		calories: 120,
		proteinG: 4.5,
		fatG: 3.2,
		carbsG: 19.7,
	},
};

describe('Admin food catalog PostgreSQL HTTP contracts', () => {
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

	test('manages only system products and preserves meal snapshots', async () => {
		const userId = await createUser('admin-food-user@example.com');
		const userToken = authorization(userId);
		const adminToken = authorization(userId, 'admin');
		const custom = await request(app)
			.post('/api/v1/nutrition/products')
			.set('Authorization', userToken)
			.send({
				...systemProductRequest,
				name: 'Integration custom oatmeal',
			})
			.expect(201);

		const created = await request(app)
			.post('/api/v1/admin/food-products')
			.set('Authorization', adminToken)
			.send({ ...systemProductRequest, name: '  Integration oatmeal  ' })
			.expect(201);
		const productId = created.body.data.id;
		expect(created.body.data).toMatchObject({
			name: 'Integration oatmeal',
			source: 'system',
			isActive: true,
		});

		const stored = await pool.query(
			`SELECT owner_user_id AS "ownerUserId"
			 FROM food_products
			 WHERE id = $1`,
			[productId],
		);
		expect(stored.rows[0].ownerUserId).toBeNull();

		const listed = await request(app)
			.get('/api/v1/admin/food-products?query=integration')
			.set('Authorization', adminToken)
			.expect(200);
		expect(listed.body.data.map(product => product.id)).toEqual([productId]);

		for (const [method, body] of [
			['get', undefined],
			['patch', { name: 'Admin must not change this' }],
			['delete', undefined],
		]) {
			let adminRequest = request(app)[method](
				`/api/v1/admin/food-products/${custom.body.data.id}`,
			).set('Authorization', adminToken);
			if (body !== undefined) {
				adminRequest = adminRequest.send(body);
			}
			await adminRequest.expect(404);
		}

		const meal = await request(app)
			.post('/api/v1/nutrition/meals')
			.set('Authorization', userToken)
			.send({
				mealType: 'breakfast',
				eatenAt: '2026-08-11T08:00:00Z',
				items: [{ productId, amountG: 100 }],
			})
			.expect(201);

		await request(app)
			.patch(`/api/v1/admin/food-products/${productId}`)
			.set('Authorization', adminToken)
			.send({
				name: 'Updated integration oatmeal',
				nutritionPer100g: {
					calories: 150,
					proteinG: 5,
					fatG: 4,
					carbsG: 20,
				},
			})
			.expect(200);

		await request(app)
			.delete(`/api/v1/admin/food-products/${productId}`)
			.set('Authorization', adminToken)
			.expect(200);
		await request(app)
			.delete(`/api/v1/admin/food-products/${productId}`)
			.set('Authorization', adminToken)
			.expect(200);

		await request(app)
			.get('/api/v1/nutrition/products?query=updated')
			.set('Authorization', userToken)
			.expect(200)
			.expect(response => expect(response.body.data).toEqual([]));

		await request(app)
			.get(`/api/v1/admin/food-products/${productId}`)
			.set('Authorization', adminToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toMatchObject({
					name: 'Updated integration oatmeal',
					isActive: false,
				});
			});

		await request(app)
			.get(`/api/v1/nutrition/meals/${meal.body.data.id}`)
			.set('Authorization', userToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data.items[0]).toMatchObject({
					productId,
					name: 'Integration oatmeal',
					nutritionPer100g: systemProductRequest.nutritionPer100g,
					nutritionTotal: systemProductRequest.nutritionPer100g,
				});
			});

		await request(app)
			.patch(`/api/v1/admin/food-products/${productId}`)
			.set('Authorization', adminToken)
			.send({ isActive: true })
			.expect(200);

		await request(app)
			.get('/api/v1/nutrition/products?query=updated')
			.set('Authorization', userToken)
			.expect(200)
			.expect(response => {
				expect(response.body.data).toEqual([
					expect.objectContaining({ id: productId, isActive: true }),
				]);
			});
	});
});
