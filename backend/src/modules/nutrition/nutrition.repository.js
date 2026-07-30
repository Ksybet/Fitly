const { pool } = require('../../config/db');

const productColumns = `
	id,
	name,
	calories_per_100g AS "calories",
	protein_g_per_100g AS "proteinG",
	fat_g_per_100g AS "fatG",
	carbs_g_per_100g AS "carbsG",
	is_active AS "isActive",
	CASE
		WHEN owner_user_id IS NULL THEN 'system'
		ELSE 'custom'
	END AS source,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

const mealEntryColumns = `
	id,
	meal_type AS "mealType",
	eaten_at AS "eatenAt",
	TO_CHAR(eaten_at AT TIME ZONE $2, 'YYYY-MM-DD') AS date,
	title,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

const mealItemColumns = `
	id,
	meal_entry_id AS "mealEntryId",
	product_id AS "productId",
	name,
	amount_g AS "amountG",
	calories_per_100g AS "per100gCalories",
	protein_g_per_100g AS "per100gProteinG",
	fat_g_per_100g AS "per100gFatG",
	carbs_g_per_100g AS "per100gCarbsG",
	total_calories AS "totalCalories",
	total_protein_g AS "totalProteinG",
	total_fat_g AS "totalFatG",
	total_carbs_g AS "totalCarbsG"
`;

function productVisibility(scope) {
	if (scope === 'system') {
		return 'owner_user_id IS NULL AND $1::integer > 0';
	}

	if (scope === 'custom') {
		return 'owner_user_id = $1';
	}

	return '(owner_user_id IS NULL OR owner_user_id = $1)';
}

async function searchProducts(userId, filters) {
	const conditions = [
		'is_active = TRUE',
		productVisibility(filters.scope),
	];
	const values = [userId];

	if (filters.query) {
		values.push(`%${filters.query}%`);
		conditions.push(`name ILIKE $${values.length}`);
	}

	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM food_products
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${productColumns}
		 FROM food_products
		 WHERE ${where}
		 ORDER BY LOWER(name) ASC, id ASC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: result.rows,
		total: countResult.rows[0].total,
	};
}

async function createCustomProduct(userId, product) {
	const result = await pool.query(
		`INSERT INTO food_products (
			owner_user_id,
			name,
			calories_per_100g,
			protein_g_per_100g,
			fat_g_per_100g,
			carbs_g_per_100g,
			is_active
		 )
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING ${productColumns}`,
		[
			userId,
			product.name,
			product.nutritionPer100g.calories,
			product.nutritionPer100g.proteinG,
			product.nutritionPer100g.fatG,
			product.nutritionPer100g.carbsG,
			product.isActive,
		],
	);

	return result.rows[0];
}

async function getAvailableProductsByIds(userId, productIds) {
	if (productIds.length === 0) {
		return [];
	}

	const result = await pool.query(
		`SELECT ${productColumns}
		 FROM food_products
		 WHERE id = ANY($2::integer[])
		   AND is_active = TRUE
		   AND (owner_user_id IS NULL OR owner_user_id = $1)`,
		[userId, productIds],
	);

	return result.rows;
}

async function insertMealItems(client, mealId, items) {
	for (const item of items) {
		await client.query(
			`INSERT INTO meal_items (
				meal_entry_id,
				product_id,
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
			 VALUES (
				$1, $2, $3, $4, $5, $6,
				$7, $8, $9, $10, $11, $12
			 )`,
			[
				mealId,
				item.productId,
				item.name,
				item.amountG,
				item.nutritionPer100g.calories,
				item.nutritionPer100g.proteinG,
				item.nutritionPer100g.fatG,
				item.nutritionPer100g.carbsG,
				item.nutritionTotal.calories,
				item.nutritionTotal.proteinG,
				item.nutritionTotal.fatG,
				item.nutritionTotal.carbsG,
			],
		);
	}
}

async function getMealRecord(queryable, userId, mealId, timezone) {
	const entryResult = await queryable.query(
		`SELECT ${mealEntryColumns}
		 FROM meal_entries
		 WHERE user_id = $1
		   AND id = $3`,
		[userId, timezone, mealId],
	);

	if (!entryResult.rows[0]) {
		return null;
	}

	const itemsResult = await queryable.query(
		`SELECT ${mealItemColumns}
		 FROM meal_items
		 WHERE meal_entry_id = $1
		 ORDER BY id ASC`,
		[mealId],
	);

	return {
		entry: entryResult.rows[0],
		items: itemsResult.rows,
	};
}

async function createMeal(userId, meal, timezone) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		const result = await client.query(
			`INSERT INTO meal_entries (
				user_id,
				meal_type,
				eaten_at,
				title
			 )
			 VALUES ($1, $2, $3, $4)
			 RETURNING id`,
			[userId, meal.mealType, meal.eatenAt, meal.title],
		);
		const mealId = result.rows[0].id;

		await insertMealItems(client, mealId, meal.items);
		const record = await getMealRecord(client, userId, mealId, timezone);
		await client.query('COMMIT');
		return record;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function listMeals(userId, filters, timezone) {
	const conditions = ['user_id = $1'];
	const values = [userId, timezone];

	if (filters.from) {
		values.push(filters.from);
		conditions.push(
			`eaten_at >= ($${values.length}::date::timestamp AT TIME ZONE $2)`,
		);
	}

	if (filters.to) {
		values.push(filters.to);
		conditions.push(
			`eaten_at < (
				($${values.length}::date + 1)::timestamp AT TIME ZONE $2
			 )`,
		);
	}

	if (filters.mealType) {
		values.push(filters.mealType);
		conditions.push(`meal_type = $${values.length}`);
	}

	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM meal_entries
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const entriesResult = await pool.query(
		`SELECT ${mealEntryColumns}
		 FROM meal_entries
		 WHERE ${where}
		 ORDER BY eaten_at DESC, id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);
	const entryIds = entriesResult.rows.map(entry => entry.id);
	let items = [];

	if (entryIds.length > 0) {
		const itemsResult = await pool.query(
			`SELECT ${mealItemColumns}
			 FROM meal_items
			 WHERE meal_entry_id = ANY($1::integer[])
			 ORDER BY meal_entry_id ASC, id ASC`,
			[entryIds],
		);
		items = itemsResult.rows;
	}

	return {
		records: entriesResult.rows.map(entry => ({
			entry,
			items: items.filter(item => Number(item.mealEntryId) === Number(entry.id)),
		})),
		total: countResult.rows[0].total,
	};
}

async function getMealById(userId, mealId, timezone) {
	return getMealRecord(pool, userId, mealId, timezone);
}

async function updateMeal(userId, mealId, meal, timezone) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		const result = await client.query(
			`UPDATE meal_entries
			 SET meal_type = $3,
			     eaten_at = $4,
			     title = $5,
			     updated_at = CURRENT_TIMESTAMP
			 WHERE user_id = $1
			   AND id = $2
			 RETURNING id`,
			[userId, mealId, meal.mealType, meal.eatenAt, meal.title],
		);

		if (!result.rows[0]) {
			await client.query('ROLLBACK');
			return null;
		}

		await client.query(
			'DELETE FROM meal_items WHERE meal_entry_id = $1',
			[mealId],
		);
		await insertMealItems(client, mealId, meal.items);
		const record = await getMealRecord(client, userId, mealId, timezone);
		await client.query('COMMIT');
		return record;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function deleteMeal(userId, mealId) {
	const result = await pool.query(
		`DELETE FROM meal_entries
		 WHERE user_id = $1
		   AND id = $2
		 RETURNING id`,
		[userId, mealId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	searchProducts,
	createCustomProduct,
	getAvailableProductsByIds,
	createMeal,
	listMeals,
	getMealById,
	updateMeal,
	deleteMeal,
};
