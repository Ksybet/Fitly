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
			'TRUNCATE TABLE food_products, users RESTART IDENTITY CASCADE',
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
});
