const { sql, poolPromise } = require('../../config/db');

async function getTodayMood(userId) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.query(`
			SELECT
				id,
				user_id AS userId,
				mood_date AS moodDate,
				mood_score AS moodScore,
				mood_label AS moodLabel,
				mood_emoji AS moodEmoji,
				note,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM MoodEntries
			WHERE user_id = @userId
			  AND mood_date = CAST(GETDATE() AS DATE)
		`);

	return result.recordset[0] || null;
}

async function upsertTodayMood(userId, moodData) {
	const pool = await poolPromise;

	const result = await pool
		.request()
		.input('userId', sql.Int, userId)
		.input('moodScore', sql.Int, moodData.moodScore ?? null)
		.input('moodLabel', sql.NVarChar(50), moodData.moodLabel || null)
		.input('moodEmoji', sql.NVarChar(10), moodData.moodEmoji || null)
		.input('note', sql.NVarChar(500), moodData.note || null)
		.query(`
			MERGE MoodEntries AS target
			USING (
				SELECT
					@userId AS user_id,
					CAST(GETDATE() AS DATE) AS mood_date
			) AS source
			ON target.user_id = source.user_id
			   AND target.mood_date = source.mood_date

			WHEN MATCHED THEN
				UPDATE SET
					mood_score = @moodScore,
					mood_label = @moodLabel,
					mood_emoji = @moodEmoji,
					note = @note,
					updated_at = GETDATE()

			WHEN NOT MATCHED THEN
				INSERT (
					user_id,
					mood_date,
					mood_score,
					mood_label,
					mood_emoji,
					note
				)
				VALUES (
					@userId,
					CAST(GETDATE() AS DATE),
					@moodScore,
					@moodLabel,
					@moodEmoji,
					@note
				);

			SELECT
				id,
				user_id AS userId,
				mood_date AS moodDate,
				mood_score AS moodScore,
				mood_label AS moodLabel,
				mood_emoji AS moodEmoji,
				note,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM MoodEntries
			WHERE user_id = @userId
			  AND mood_date = CAST(GETDATE() AS DATE)
		`);

	return result.recordset[0];
}

module.exports = {
	getTodayMood,
	upsertTodayMood,
};
