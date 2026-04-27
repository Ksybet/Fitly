const { sql, poolPromise } = require('../../config/db');

async function getTodaySleep(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT
				id,
				user_id AS userId,
				sleep_date AS sleepDate,
				started_at AS sleepStart,
				ended_at AS sleepEnd,
				duration_hours AS sleepHours,
				duration_minutes AS sleepMinutes,
				quality AS sleepQuality,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM SleepEntries
			WHERE user_id = @userId
			  AND sleep_date = CAST(GETDATE() AS DATE)
		`);

	return result.recordset[0] || null;
}

async function upsertTodaySleep(userId, sleepData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.input('sleepStart', sql.NVarChar(10), sleepData.sleepStart)
		.input('sleepEnd', sql.NVarChar(10), sleepData.sleepEnd)
		.input('sleepHours', sql.Int, sleepData.sleepHours)
		.input('sleepMinutes', sql.Int, sleepData.sleepMinutes)
		.input('sleepQuality', sql.NVarChar(50), sleepData.sleepQuality || null)
		.query(`
			MERGE SleepEntries AS target
			USING (
				SELECT
					@userId AS user_id,
					CAST(GETDATE() AS DATE) AS sleep_date
			) AS source
			ON target.user_id = source.user_id
			   AND target.sleep_date = source.sleep_date

			WHEN MATCHED THEN
				UPDATE SET
					started_at = @sleepStart,
					ended_at = @sleepEnd,
					duration_hours = @sleepHours,
					duration_minutes = @sleepMinutes,
					quality = @sleepQuality,
					updated_at = GETDATE()

			WHEN NOT MATCHED THEN
				INSERT (
					user_id,
					sleep_date,
					started_at,
					ended_at,
					duration_hours,
					duration_minutes,
					quality
				)
				VALUES (
					@userId,
					CAST(GETDATE() AS DATE),
					@sleepStart,
					@sleepEnd,
					@sleepHours,
					@sleepMinutes,
					@sleepQuality
				);

			SELECT
				id,
				user_id AS userId,
				sleep_date AS sleepDate,
				started_at AS sleepStart,
				ended_at AS sleepEnd,
				duration_hours AS sleepHours,
				duration_minutes AS sleepMinutes,
				quality AS sleepQuality,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM SleepEntries
			WHERE user_id = @userId
			  AND sleep_date = CAST(GETDATE() AS DATE)
		`);

	return result.recordset[0];
}

module.exports = {
	getTodaySleep,
	upsertTodaySleep,
};
