const { sql, poolPromise } = require('../../config/db');

function mapUser(row) {
	return {
		id: row.id,
		email: row.email,
		password_hash: row.passwordHash,
		role: row.role,
		is_active: row.isActive,
	};
}

async function findUserByEmail(email) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('email', sql.NVarChar(255), email)
		.query(`
			SELECT TOP 1
				id,
				email,
				passwordHash,
				role,
				isActive
			FROM Users
			WHERE email = @email
		`);

	if (result.recordset.length === 0) {
		return null;
	}

	return mapUser(result.recordset[0]);
}

async function createUser(userData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('email', sql.NVarChar(255), userData.email)
		.input('passwordHash', sql.NVarChar(255), userData.password_hash)
		.input('role', sql.NVarChar(50), userData.role || 'user')
		.query(`
			INSERT INTO Users (email, passwordHash, role)
			OUTPUT INSERTED.id, INSERTED.email, INSERTED.passwordHash, INSERTED.role, INSERTED.isActive
			VALUES (@email, @passwordHash, @role)
		`);

	return mapUser(result.recordset[0]);
}

module.exports = {
	findUserByEmail,
	createUser,
};
