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

async function rotateSession({
	refreshTokenHash,
	nextRefreshTokenHash,
	nextExpiresAt,
}) {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const revokedSession = await client.query(
			`UPDATE auth_sessions AS session
			 SET revoked_at = CURRENT_TIMESTAMP
			 FROM users
			 WHERE session.refresh_token_hash = $1
			   AND session.user_id = users.id
			   AND session.revoked_at IS NULL
			   AND session.expires_at > CURRENT_TIMESTAMP
			   AND users.is_active = TRUE
			 RETURNING session.user_id AS "userId"`,
			[refreshTokenHash],
		);

		if (revokedSession.rows.length === 0) {
			await client.query('COMMIT');
			return null;
		}

		const { userId } = revokedSession.rows[0];
		const nextSession = await client.query(
			`INSERT INTO auth_sessions (
				user_id,
				refresh_token_hash,
				expires_at
			 )
			 VALUES ($1, $2, $3)
			 RETURNING id`,
			[userId, nextRefreshTokenHash, nextExpiresAt],
		);

		await client.query('COMMIT');

		return {
			id: nextSession.rows[0].id,
			userId,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function revokeSession({ userId, refreshTokenHash }) {
	const result = await pool.query(
		`UPDATE auth_sessions
		 SET revoked_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1
		   AND refresh_token_hash = $2
		   AND revoked_at IS NULL
		   AND expires_at > CURRENT_TIMESTAMP
		 RETURNING id`,
		[userId, refreshTokenHash],
	);

	return result.rows[0] || null;
}

async function revokeAllSessions(userId) {
	const result = await pool.query(
		`UPDATE auth_sessions
		 SET revoked_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1
		   AND revoked_at IS NULL
		   AND expires_at > CURRENT_TIMESTAMP`,
		[userId],
	);

	return result.rowCount;
}

module.exports = {
	createSession,
	rotateSession,
	revokeSession,
	revokeAllSessions,
};
