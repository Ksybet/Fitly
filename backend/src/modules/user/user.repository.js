const { pool } = require('../../config/db');

const userColumns = `
	id,
	email,
	password_hash AS "passwordHash",
	role,
	is_active AS "isActive",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function findUserByEmail(email) {
	const result = await pool.query(
		`SELECT ${userColumns}
		 FROM users
		 WHERE email = $1
		 LIMIT 1`,
		[email],
	);

	return result.rows[0] || null;
}

async function createUser(userData) {
	const result = await pool.query(
		`INSERT INTO users (email, password_hash, role, is_active)
		 VALUES ($1, $2, $3, $4)
		 RETURNING ${userColumns}`,
		[userData.email, userData.passwordHash, userData.role, userData.isActive],
	);

	return result.rows[0];
}

async function findUserById(userId) {
	const result = await pool.query(
		`SELECT ${userColumns}
		 FROM users
		 WHERE id = $1
		 LIMIT 1`,
		[Number(userId)],
	);

	return result.rows[0] || null;
}

async function deleteUserById(userId) {
	await pool.query('DELETE FROM users WHERE id = $1', [Number(userId)]);
	return true;
}

module.exports = {
	findUserByEmail,
	findUserById,
	createUser,
	deleteUserById,
};
