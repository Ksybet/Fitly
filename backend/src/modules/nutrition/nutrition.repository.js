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

module.exports = {
	searchProducts,
	createCustomProduct,
};
