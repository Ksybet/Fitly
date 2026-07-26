const { pool } = require('../../config/db');

const moodColumns = `
	id,
	mood_date::text AS date,
	mood_score AS "moodScore",
	mood_label AS "moodLabel",
	mood_emoji AS "moodEmoji",
	note,
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getTodayMood(userId) {
	const result = await pool.query(
		`SELECT ${moodColumns}
		 FROM mood_entries
		 WHERE user_id = $1
		   AND mood_date = CURRENT_DATE`,
		[userId],
	);

	return result.rows[0] || null;
}

async function upsertTodayMood(userId, moodData) {
	const result = await pool.query(
		`INSERT INTO mood_entries (
			user_id, mood_date, mood_score, mood_label, mood_emoji, note
		 )
		 VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
		 ON CONFLICT (user_id, mood_date)
		 DO UPDATE SET
			mood_score = EXCLUDED.mood_score,
			mood_label = EXCLUDED.mood_label,
			mood_emoji = EXCLUDED.mood_emoji,
			note = EXCLUDED.note,
			updated_at = CURRENT_TIMESTAMP
		 RETURNING ${moodColumns}`,
		[
			userId,
			moodData.moodScore,
			moodData.moodLabel ?? null,
			moodData.moodEmoji ?? null,
			moodData.note ?? null,
		],
	);

	return result.rows[0];
}

module.exports = {
	getTodayMood,
	upsertTodayMood,
};
