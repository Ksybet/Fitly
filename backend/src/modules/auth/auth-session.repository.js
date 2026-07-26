const { pool } = require('../../config/db');

async function createSession({
	userId,
	refreshTokenHash,
	expiresAt,
}) {
	const result = await pool.query(
		`INSERT INTO auth_sessions (
			user_id,
			refresh_token_hash,
			expires_at
		 )
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		[userId, refreshTokenHash, expiresAt],
	);

	return result.rows[0];
}

module.exports = { createSession };
