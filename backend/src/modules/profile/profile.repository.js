const { pool } = require('../../config/db');

const profileColumns = `
	id,
	user_id AS "userId",
	first_name AS "firstName",
	birth_date AS "birthDate",
	gender,
	height_cm::double precision AS "heightCm",
	weight_kg::double precision AS "weightKg",
	updated_at AS "updatedAt"
`;

async function findProfileByUserId(userId) {
	const result = await pool.query(
		`SELECT ${profileColumns}
		 FROM profiles
		 WHERE user_id = $1
		 LIMIT 1`,
		[userId],
	);

	return result.rows[0] || null;
}

async function createProfile(profileData) {
	const result = await pool.query(
		`INSERT INTO profiles (
			user_id, first_name, birth_date, gender, height_cm, weight_kg
		 )
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING ${profileColumns}`,
		[
			profileData.userId,
			profileData.firstName || null,
			profileData.birthDate || null,
			profileData.gender || null,
			profileData.heightCm ?? null,
			profileData.weightKg ?? null,
		],
	);

	return result.rows[0];
}

async function updateProfileByUserId(userId, updateData) {
	const result = await pool.query(
		`UPDATE profiles
		 SET first_name = $2,
			 birth_date = $3,
			 gender = $4,
			 height_cm = $5,
			 weight_kg = $6,
			 updated_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1
		 RETURNING ${profileColumns}`,
		[
			userId,
			updateData.firstName || null,
			updateData.birthDate || null,
			updateData.gender || null,
			updateData.heightCm ?? null,
			updateData.weightKg ?? null,
		],
	);

	return result.rows[0] || null;
}

module.exports = {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
};
