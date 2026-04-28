const { sql, poolPromise } = require('../../config/db');

async function getFavorites(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			IF NOT EXISTS (SELECT 1 FROM Favorites WHERE user_id = @userId)
			BEGIN
				INSERT INTO Favorites (user_id)
				VALUES (@userId)
			END

			SELECT
				id,
				user_id AS userId,
				CAST(water AS bit) AS water,
				CAST(weight AS bit) AS weight,
				CAST(height AS bit) AS height,
				CAST(bmi AS bit) AS bmi,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM Favorites
			WHERE user_id = @userId
		`);

	return result.recordset[0];
}

async function updateFavorites(userId, favorites) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.input('water', sql.Bit, Boolean(favorites.water))
		.input('weight', sql.Bit, Boolean(favorites.weight))
		.input('height', sql.Bit, Boolean(favorites.height))
		.input('bmi', sql.Bit, Boolean(favorites.bmi))
		.query(`
			MERGE Favorites AS target
			USING (SELECT @userId AS user_id) AS source
			ON target.user_id = source.user_id

			WHEN MATCHED THEN
				UPDATE SET
					water = @water,
					weight = @weight,
					height = @height,
					bmi = @bmi,
					updated_at = SYSUTCDATETIME()

			WHEN NOT MATCHED THEN
				INSERT (user_id, water, weight, height, bmi)
				VALUES (@userId, @water, @weight, @height, @bmi);

			SELECT
				id,
				user_id AS userId,
				CAST(water AS bit) AS water,
				CAST(weight AS bit) AS weight,
				CAST(height AS bit) AS height,
				CAST(bmi AS bit) AS bmi,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM Favorites
			WHERE user_id = @userId
		`);

	return result.recordset[0];
}

module.exports = {
	getFavorites,
	updateFavorites,
};
