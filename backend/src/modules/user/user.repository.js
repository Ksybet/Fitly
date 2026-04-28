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

	const result = await pool
		.request()
		.input('email', sql.NVarChar, userData.email)
		.input('passwordHash', sql.NVarChar, userData.passwordHash)
		.input('role', sql.NVarChar, userData.role)
		.input('isActive', sql.Bit, userData.isActive)
		.query(`
			INSERT INTO Users (
				email,
				passwordHash,
				role,
				isActive,
				createdAt,
				updatedAt
			)
			OUTPUT
				INSERTED.id,
				INSERTED.email,
				INSERTED.passwordHash,
				INSERTED.role,
				INSERTED.isActive,
				INSERTED.createdAt,
				INSERTED.updatedAt
			VALUES (
				@email,
				@passwordHash,
				@role,
				@isActive,
				GETDATE(),
				GETDATE()
			)
		`);

	return result.recordset[0];
}

async function findUserById(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.UniqueIdentifier, userId)
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
			WHERE id = @userId
		`);

	return result.recordset[0] || null;
}

async function deleteUserById(userId) {
	const pool = await poolPromise;
	const transaction = new sql.Transaction(pool);

	await transaction.begin();

	try {
		const request = new sql.Request(transaction);
		request.input('userId', sql.UniqueIdentifier, userId);

		await request.query(`
			IF OBJECT_ID('dbo.Profiles', 'U') IS NOT NULL
				DELETE FROM Profiles WHERE userId = @userId;

			IF OBJECT_ID('dbo.Goals', 'U') IS NOT NULL
				DELETE FROM Goals WHERE userId = @userId;

			IF OBJECT_ID('dbo.WaterEntries', 'U') IS NOT NULL
				DELETE FROM WaterEntries WHERE userId = @userId;

			IF OBJECT_ID('dbo.SleepEntries', 'U') IS NOT NULL
				DELETE FROM SleepEntries WHERE userId = @userId;

			IF OBJECT_ID('dbo.MoodEntries', 'U') IS NOT NULL
				DELETE FROM MoodEntries WHERE userId = @userId;

			IF OBJECT_ID('dbo.Favorites', 'U') IS NOT NULL
				DELETE FROM Favorites WHERE userId = @userId;

			IF OBJECT_ID('dbo.DailyEntries', 'U') IS NOT NULL
				DELETE FROM DailyEntries WHERE userId = @userId;

			DELETE FROM Users WHERE id = @userId;
		`);

		await transaction.commit();
		return true;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

module.exports = {
	findUserByEmail,
	findUserById,
	createUser,
	deleteUserById,
};
