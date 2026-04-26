const { sql, poolPromise } = require('../../config/db');

function mapProfile(row) {
	return {
		id: row.id,
		userId: row.userId,
		firstName: row.firstName || '',
		birthDate: row.birthDate,
		gender: row.gender,
		weightKg: row.weightKg,
		heightCm: row.heightCm,
		updatedAt: row.updatedAt,
	};
}

async function findProfileByUserId(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, Number(userId))
		.query(`
			SELECT TOP 1
				id,
				userId,
				firstName,
				birthDate,
				gender,
				weightKg,
				heightCm,
				updatedAt
			FROM Profiles
			WHERE userId = @userId
		`);

	if (result.recordset.length === 0) {
		return null;
	}

	return mapProfile(result.recordset[0]);
}

async function createProfile(profileData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, Number(profileData.userId))
		.input('firstName', sql.NVarChar(100), profileData.firstName || '')
		.input('birthDate', sql.Date, profileData.birthDate || null)
		.input('gender', sql.NVarChar(20), profileData.gender || null)
		.input('weightKg', sql.Decimal(5, 2), profileData.weightKg || null)
		.input('heightCm', sql.Decimal(5, 2), profileData.heightCm || null)
		.query(`
			INSERT INTO Profiles (
				userId,
				firstName,
				birthDate,
				gender,
				weightKg,
				heightCm
			)
			OUTPUT
				INSERTED.id,
				INSERTED.userId,
				INSERTED.firstName,
				INSERTED.birthDate,
				INSERTED.gender,
				INSERTED.weightKg,
				INSERTED.heightCm,
				INSERTED.updatedAt
			VALUES (
				@userId,
				@firstName,
				@birthDate,
				@gender,
				@weightKg,
				@heightCm
			)
		`);

	return mapProfile(result.recordset[0]);
}

async function updateProfileByUserId(userId, updateData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, Number(userId))
		.input('firstName', sql.NVarChar(100), updateData.firstName || '')
		.input('birthDate', sql.Date, updateData.birthDate || null)
		.input('gender', sql.NVarChar(20), updateData.gender || null)
		.input('weightKg', sql.Decimal(5, 2), updateData.weightKg || null)
		.input('heightCm', sql.Decimal(5, 2), updateData.heightCm || null)
		.query(`
			UPDATE Profiles
			SET
				firstName = @firstName,
				birthDate = @birthDate,
				gender = @gender,
				weightKg = @weightKg,
				heightCm = @heightCm,
				updatedAt = SYSDATETIME()
			OUTPUT
				INSERTED.id,
				INSERTED.userId,
				INSERTED.firstName,
				INSERTED.birthDate,
				INSERTED.gender,
				INSERTED.weightKg,
				INSERTED.heightCm,
				INSERTED.updatedAt
			WHERE userId = @userId
		`);

	if (result.recordset.length === 0) {
		return null;
	}

	return mapProfile(result.recordset[0]);
}

module.exports = {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
};
