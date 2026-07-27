const { pool } = require('../../config/db');

const profileQuery = `
	SELECT
		u.id AS "userId",
		u.email,
		p.first_name AS "firstName",
		p.birth_date AS "birthDate",
		p.gender,
		p.height_cm::double precision AS "heightCm",
		COALESCE(
			latest_weight.weight_kg,
			p.weight_kg
		)::double precision AS "weightKg",
		COALESCE(p.updated_at, u.updated_at) AS "updatedAt"
	FROM users u
	LEFT JOIN profiles p ON p.user_id = u.id
	LEFT JOIN LATERAL (
		SELECT weight_kg
		FROM weight_entries
		WHERE user_id = u.id
		ORDER BY entry_date DESC, id DESC
		LIMIT 1
	) latest_weight ON TRUE
	WHERE u.id = $1
	LIMIT 1
`;

async function findProfileByUserId(userId) {
	const result = await pool.query(profileQuery, [userId]);
	return result.rows[0] || null;
}

async function saveProfile(userId, profile, { recordWeight, weightDate }) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');
		await client.query(
			`INSERT INTO profiles (
				user_id,
				first_name,
				birth_date,
				gender,
				height_cm,
				weight_kg
			 )
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (user_id) DO UPDATE
			 SET first_name = EXCLUDED.first_name,
			     birth_date = EXCLUDED.birth_date,
			     gender = EXCLUDED.gender,
			     height_cm = EXCLUDED.height_cm,
			     weight_kg = EXCLUDED.weight_kg,
			     updated_at = CURRENT_TIMESTAMP`,
			[
				userId,
				profile.firstName,
				profile.birthDate,
				profile.gender,
				profile.heightCm,
				profile.weightKg,
			],
		);

		if (recordWeight) {
			await client.query(
				`INSERT INTO weight_entries (
					user_id,
					entry_date,
					weight_kg
				 )
				 VALUES ($1, $2::date, $3)
				 ON CONFLICT (user_id, entry_date) DO UPDATE
				 SET weight_kg = EXCLUDED.weight_kg,
				     updated_at = CURRENT_TIMESTAMP`,
				[userId, weightDate, profile.weightKg],
			);
		}

		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}

	return findProfileByUserId(userId);
}

module.exports = {
	findProfileByUserId,
	saveProfile,
};
