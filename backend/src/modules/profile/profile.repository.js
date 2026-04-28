const { sql, poolPromise } = require('../../config/db');

async function findProfileByUserId(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT TOP 1
				id,
				userId,
				firstName,
				birthDate,
				gender,
				heightCm,
				weightKg,
				updatedAt
			FROM Profiles
			WHERE userId = @userId
		`);

	return result.recordset[0] || null;
}

async function createProfile(profileData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, profileData.userId)
		.input('firstName', sql.NVarChar(100), profileData.firstName || null)
		.input('birthDate', sql.Date, profileData.birthDate || null)
		.input('gender', sql.NVarChar(20), profileData.gender || null)
		.input('heightCm', sql.Decimal(5, 2), profileData.heightCm || null)
		.input('weightKg', sql.Decimal(5, 2), profileData.weightKg || null)
		.query(`
			INSERT INTO Profiles (
				userId,
				firstName,
				birthDate,
				gender,
				heightCm,
				weightKg,
				updatedAt
			)
			OUTPUT
				INSERTED.id,
				INSERTED.userId,
				INSERTED.firstName,
				INSERTED.birthDate,
				INSERTED.gender,
				INSERTED.heightCm,
				INSERTED.weightKg,
				INSERTED.updatedAt
			VALUES (
				@userId,
				@firstName,
				@birthDate,
				@gender,
				@heightCm,
				@weightKg,
				GETDATE()
			)
		`);

	return result.recordset[0];
}

async function updateProfileByUserId(userId, updateData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.input('firstName', sql.NVarChar(100), updateData.firstName || null)
		.input('birthDate', sql.Date, updateData.birthDate || null)
		.input('gender', sql.NVarChar(20), updateData.gender || null)
		.input('heightCm', sql.Decimal(5, 2), updateData.heightCm || null)
		.input('weightKg', sql.Decimal(5, 2), updateData.weightKg || null)
		.query(`
			UPDATE Profiles
			SET
				firstName = @firstName,
				birthDate = @birthDate,
				gender = @gender,
				heightCm = @heightCm,
				weightKg = @weightKg,
				updatedAt = GETDATE()
			OUTPUT
				INSERTED.id,
				INSERTED.userId,
				INSERTED.firstName,
				INSERTED.birthDate,
				INSERTED.gender,
				INSERTED.heightCm,
				INSERTED.weightKg,
				INSERTED.updatedAt
			WHERE userId = @userId
		`);

	return result.recordset[0] || null;
}

module.exports = {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
};
