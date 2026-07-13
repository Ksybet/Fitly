const { pool } = require('../../config/db');

const favoriteColumns = `
	id,
	user_id AS "userId",
	water,
	weight,
	height,
	bmi,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getFavorites(userId) {
	await pool.query(
		`INSERT INTO favorites (user_id)
		 VALUES ($1)
		 ON CONFLICT (user_id) DO NOTHING`,
		[userId],
	);

	const result = await pool.query(
		`SELECT ${favoriteColumns}
		 FROM favorites
		 WHERE user_id = $1`,
		[userId],
	);

	return result.rows[0];
}

async function updateFavorites(userId, favorites) {
	const result = await pool.query(
		`INSERT INTO favorites (user_id, water, weight, height, bmi)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (user_id)
		 DO UPDATE SET
			water = EXCLUDED.water,
			weight = EXCLUDED.weight,
			height = EXCLUDED.height,
			bmi = EXCLUDED.bmi,
			updated_at = CURRENT_TIMESTAMP
		 RETURNING ${favoriteColumns}`,
		[
			userId,
			Boolean(favorites.water),
			Boolean(favorites.weight),
			Boolean(favorites.height),
			Boolean(favorites.bmi),
		],
	);

	return result.rows[0];
}

module.exports = {
	getFavorites,
	updateFavorites,
};
