const { sql, poolPromise } = require('../../config/db');

async function findUserByEmail(email) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('email', sql.NVarChar, email)
		.query(`
			SELECT TOP 1
				id,
				email,
				passwordHash,
				role,
				isActive,
				createdAt,
				updatedAt
			FROM Users
			WHERE email = @email
		`);

	return result.recordset[0] || null;
}

async function createUser(userData) {
	const pool = await poolPromise;

	await pool
		.request()
		.input('id', sql.NVarChar, userData.id)
		.input('email', sql.NVarChar, userData.email)
		.input('passwordHash', sql.NVarChar, userData.passwordHash)
		.input('role', sql.NVarChar, userData.role)
		.input('isActive', sql.Bit, userData.isActive)
		.query(`
			INSERT INTO Users (
				id,
				email,
				passwordHash,
				role,
				isActive,
				createdAt,
				updatedAt
			)
			VALUES (
				@id,
				@email,
				@passwordHash,
				@role,
				@isActive,
				SYSDATETIME(),
				SYSDATETIME()
			)
		`);

	return userData;
}

module.exports = {
	findUserByEmail,
	createUser,
};
