const { pool } = require('../../config/db');
const { withTransaction } = require('../../utils/db-transaction');

const waterDayQuery = `
	SELECT
		$2::date::text AS date,
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
	LEFT JOIN (
		SELECT
			user_id,
			water_date,
			SUM(amount_ml)::integer AS amount_ml
		FROM water_entries
		WHERE user_id = $1
		  AND water_date = $2::date
		GROUP BY user_id, water_date
	) entry ON TRUE
`;

async function getTodayWater(userId, date, executor = pool) {
	const result = await executor.query(waterDayQuery, [userId, date]);
	return result.rows[0];
}

async function setTodayWater(userId, date, amountMl) {
	return withTransaction(async client => {
		await client.query(
			`DELETE FROM water_entries
			 WHERE user_id = $1
			   AND water_date = $2::date`,
			[userId, date],
		);

		if (amountMl > 0) {
			await client.query(
				`INSERT INTO water_entries (
					user_id,
					water_date,
					amount_ml
				 ) VALUES ($1, $2::date, $3)`,
				[userId, date, amountMl],
			);
		}

		return getTodayWater(userId, date, client);
	});
}

module.exports = {
	getTodayWater,
	setTodayWater,
};
