const { pool } = require('../../config/db');

const foodProductColumns = `
	id,
	name,
	calories_per_100g AS "calories",
	protein_g_per_100g AS "proteinG",
	fat_g_per_100g AS "fatG",
	carbs_g_per_100g AS "carbsG",
	is_active AS "isActive",
	'system'::text AS source,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function listFoodProducts(filters) {
	const conditions = ['owner_user_id IS NULL'];
	const values = [];

	if (filters.query) {
		values.push(`%${filters.query}%`);
		conditions.push(`name ILIKE $${values.length}`);
	}

	if (filters.active !== undefined) {
		values.push(filters.active);
		conditions.push(`is_active = $${values.length}`);
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
		`SELECT ${foodProductColumns}
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

async function getFoodProductById(productId) {
	const result = await pool.query(
		`SELECT ${foodProductColumns}
		 FROM food_products
		 WHERE id = $1
		   AND owner_user_id IS NULL`,
		[productId],
	);

	return result.rows[0] || null;
}

async function createFoodProduct(product) {
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
		 VALUES (NULL, $1, $2, $3, $4, $5, $6)
		 RETURNING ${foodProductColumns}`,
		[
			product.name,
			product.nutritionPer100g.calories,
			product.nutritionPer100g.proteinG,
			product.nutritionPer100g.fatG,
			product.nutritionPer100g.carbsG,
			product.isActive ?? true,
		],
	);

	return result.rows[0];
}

async function updateFoodProduct(productId, updates) {
	const values = [productId];
	const assignments = [];

	if (updates.name !== undefined) {
		values.push(updates.name);
		assignments.push(`name = $${values.length}`);
	}

	if (updates.nutritionPer100g !== undefined) {
		for (const [field, column] of [
			['calories', 'calories_per_100g'],
			['proteinG', 'protein_g_per_100g'],
			['fatG', 'fat_g_per_100g'],
			['carbsG', 'carbs_g_per_100g'],
		]) {
			values.push(updates.nutritionPer100g[field]);
			assignments.push(`${column} = $${values.length}`);
		}
	}

	if (updates.isActive !== undefined) {
		values.push(updates.isActive);
		assignments.push(`is_active = $${values.length}`);
	}

	assignments.push('updated_at = CURRENT_TIMESTAMP');
	const result = await pool.query(
		`UPDATE food_products
		 SET ${assignments.join(',\n\t\t     ')}
		 WHERE id = $1
		   AND owner_user_id IS NULL
		 RETURNING ${foodProductColumns}`,
		values,
	);

	return result.rows[0] || null;
}

async function deactivateFoodProduct(productId) {
	const result = await pool.query(
		`UPDATE food_products
		 SET is_active = FALSE,
		     updated_at = CASE
		       WHEN is_active = TRUE THEN CURRENT_TIMESTAMP
		       ELSE updated_at
		     END
		 WHERE id = $1
		   AND owner_user_id IS NULL
		 RETURNING id`,
		[productId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	listFoodProducts,
	getFoodProductById,
	createFoodProduct,
	updateFoodProduct,
	deactivateFoodProduct,
};
