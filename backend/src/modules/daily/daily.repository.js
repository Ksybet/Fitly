const { sql, poolPromise } = require('../../config/db');

async function getToday(userId) {
	const pool = await poolPromise;

	const result = await pool.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT
				id,
				user_id AS userId,
				tracking_date AS trackingDate,
				steps,
				calories,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM DailyTracking
			WHERE user_id = @userId
			  AND tracking_date = CAST(SYSUTCDATETIME() AS DATE)
		`);

	return result.recordset[0] || null;
}

async function upsertToday(userId, data) {
	const pool = await poolPromise;

	const result = await pool.request()
		.input('userId', sql.Int, userId)
		.input('steps', sql.Int, data.steps ?? null)
		.input('calories', sql.Int, data.calories ?? null)
		.query(`
			MERGE DailyTracking AS target
			USING (
				SELECT
					@userId AS user_id,
					CAST(SYSUTCDATETIME() AS DATE) AS tracking_date
			) AS source
			ON target.user_id = source.user_id
			   AND target.tracking_date = source.tracking_date

			WHEN MATCHED THEN
				UPDATE SET
					steps = @steps,
					calories = @calories,
					updated_at = SYSUTCDATETIME()

			WHEN NOT MATCHED THEN
				INSERT (user_id, tracking_date, steps, calories)
				VALUES (@userId, CAST(SYSUTCDATETIME() AS DATE), @steps, @calories);

			SELECT
				id,
				user_id AS userId,
				tracking_date AS trackingDate,
				steps,
				calories,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM DailyTracking
			WHERE user_id = @userId
			  AND tracking_date = CAST(SYSUTCDATETIME() AS DATE)
		`);

	return result.recordset[0];
}

module.exports = {
	getToday,
	upsertToday,
};
