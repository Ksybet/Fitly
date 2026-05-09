const { sql, poolPromise } = require('../../config/db');

async function findProfileByUserId(userId) {
        const pool = await poolPromise;

        const result = await pool
                .request()
                .input('userId', sql.Int, userId)
                .query(`
                        SELECT TOP 1
                                id,
                                user_id AS userId,
                                first_name AS firstName,
                                birth_date AS birthDate,
                                gender,
                                height_cm AS heightCm,
                                weight_kg AS weightKg,
                                updated_at AS updatedAt
                        FROM Profiles
                        WHERE user_id = @userId
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
                                user_id,
                                first_name,
                                birth_date,
                                gender,
                                height_cm,
                                weight_kg,
                                updated_at
                        )
                        OUTPUT
                                INSERTED.id,
                                INSERTED.user_id AS userId,
                                INSERTED.first_name AS firstName,
                                INSERTED.birth_date AS birthDate,
                                INSERTED.gender,
                                INSERTED.height_cm AS heightCm,
                                INSERTED.weight_kg AS weightKg,
                                INSERTED.updated_at AS updatedAt
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
                                first_name = @firstName,
                                birth_date = @birthDate,
                                gender = @gender,
                                height_cm = @heightCm,
                                weight_kg = @weightKg,
                                updated_at = GETDATE()
                        OUTPUT
                                INSERTED.id,
                                INSERTED.user_id AS userId,
                                INSERTED.first_name AS firstName,
                                INSERTED.birth_date AS birthDate,
                                INSERTED.gender,
                                INSERTED.height_cm AS heightCm,
                                INSERTED.weight_kg AS weightKg,
                                INSERTED.updated_at AS updatedAt
                        WHERE user_id = @userId
                `);

        return result.recordset[0] || null;
}

module.exports = {
        findProfileByUserId,
        createProfile,
        updateProfileByUserId,
};
