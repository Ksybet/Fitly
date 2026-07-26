const { pool } = require('../../config/db');

const waterDayQuery = `
	SELECT
		CURRENT_DATE::text AS date,
		COALESCE(entry.amount_ml, 0)::integer AS "amountMl",
		COALESCE(
			(
				SELECT target_value
				FROM goals
				WHERE user_id = $1
				  AND goal_type = 'water'
				  AND unit = 'ml'
				  AND status IN ('created', 'in_progress')
				ORDER BY created_at DESC
				LIMIT 1
			),
			2000
		)::integer AS "goalMl"
	FROM (SELECT 1) singleton
	LEFT JOIN water_entries entry
		ON entry.user_id = $1
	   AND entry.water_date = CURRENT_DATE
`;

async function getTodayWater(userId) {
	const result = await pool.query(waterDayQuery, [userId]);
	return result.rows[0];
}

async function setTodayWater(userId, amountMl) {
	await pool.query(
		`INSERT INTO water_entries (
			user_id,
			water_date,
			amount_ml
		 )
		 VALUES ($1, CURRENT_DATE, $2)
		 ON CONFLICT (user_id, water_date) DO UPDATE
		 SET amount_ml = EXCLUDED.amount_ml,
		     recorded_at = CURRENT_TIMESTAMP`,
		[userId, amountMl],
	);

	return getTodayWater(userId);
}

module.exports = {
	getTodayWater,
	setTodayWater,
};
