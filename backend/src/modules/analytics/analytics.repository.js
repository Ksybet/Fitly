const { pool } = require('../../config/db');

async function getWeightEntries(userId, range) {
	const result = await pool.query(
		`SELECT
			entry_date::text AS date,
			weight_kg::double precision AS "weightKg"
		 FROM weight_entries
		 WHERE user_id = $1
		   AND entry_date BETWEEN $2::date AND $3::date
		 ORDER BY entry_date ASC, id ASC`,
		[userId, range.from, range.to],
	);

	return result.rows;
}

async function getLatestWeight(userId, endDate) {
	const result = await pool.query(
		`SELECT weight_kg::double precision AS "weightKg"
		 FROM weight_entries
		 WHERE user_id = $1
		   AND entry_date <= $2::date
		 ORDER BY entry_date DESC, id DESC
		 LIMIT 1`,
		[userId, endDate],
	);

	return result.rows[0]?.weightKg ?? null;
}

async function getProfileHeight(userId) {
	const result = await pool.query(
		`SELECT height_cm::double precision AS "heightCm"
		 FROM profiles
		 WHERE user_id = $1`,
		[userId],
	);

	return result.rows[0]?.heightCm ?? null;
}

async function getDailyActivity(userId, range, timezone) {
	const result = await pool.query(
		`WITH date_series AS (
			SELECT generate_series(
				$2::date,
				$3::date,
				INTERVAL '1 day'
			)::date AS activity_date
		),
		workout_daily AS (
			SELECT
				(ws.finished_at AT TIME ZONE $4)::date AS activity_date,
				COUNT(*)::integer AS workout_count,
				COALESCE(SUM(ws.elapsed_seconds), 0)::bigint AS elapsed_seconds,
				COALESCE(SUM(ws.calories_burned), 0)::numeric
					AS calories_burned
			FROM workout_sessions ws
			WHERE ws.user_id = $1
			  AND ws.status = 'completed'
			  AND ws.finished_at >= (
				$2::date::timestamp AT TIME ZONE $4
			  )
			  AND ws.finished_at < (
				($3::date + 1)::timestamp AT TIME ZONE $4
			  )
			GROUP BY activity_date
		),
		step_daily AS (
			SELECT tracking_date AS activity_date, steps
			FROM daily_tracking
			WHERE user_id = $1
			  AND tracking_date BETWEEN $2::date AND $3::date
		)
		SELECT
			ds.activity_date::text AS date,
			COALESCE(sd.steps, 0)::integer AS steps,
			COALESCE(wd.workout_count, 0)::integer AS "workoutCount",
			COALESCE(wd.elapsed_seconds, 0)::bigint AS "elapsedSeconds",
			COALESCE(wd.calories_burned, 0)::numeric
				AS "caloriesBurned"
		FROM date_series ds
		LEFT JOIN workout_daily wd USING (activity_date)
		LEFT JOIN step_daily sd USING (activity_date)
		ORDER BY ds.activity_date ASC`,
		[userId, range.from, range.to, timezone],
	);

	return result.rows;
}

async function getSleepEntries(userId, range) {
	const result = await pool.query(
		`SELECT
			sleep_date::text AS date,
			(
				EXTRACT(EPOCH FROM (sleep_end - sleep_start)) / 60
			)::double precision AS "durationMinutes",
			sleep_quality::integer AS quality
		 FROM sleep_entries
		 WHERE user_id = $1
		   AND sleep_date BETWEEN $2::date AND $3::date
		 ORDER BY sleep_date ASC, id ASC`,
		[userId, range.from, range.to],
	);

	return result.rows;
}

async function getNutritionTotals(userId, range, timezone) {
	const result = await pool.query(
		`SELECT
			COALESCE(SUM(mi.total_calories), 0)::numeric AS calories,
			COALESCE(SUM(mi.total_protein_g), 0)::numeric AS "proteinG",
			COALESCE(SUM(mi.total_fat_g), 0)::numeric AS "fatG",
			COALESCE(SUM(mi.total_carbs_g), 0)::numeric AS "carbsG"
		 FROM meal_entries me
		 JOIN meal_items mi ON mi.meal_entry_id = me.id
		 WHERE me.user_id = $1
		   AND me.eaten_at >= ($2::date::timestamp AT TIME ZONE $4)
		   AND me.eaten_at < (($3::date + 1)::timestamp AT TIME ZONE $4)`,
		[userId, range.from, range.to, timezone],
	);

	return result.rows[0];
}

async function getTotalWater(userId, range) {
	const result = await pool.query(
		`SELECT COALESCE(SUM(amount_ml), 0)::bigint AS "totalWaterMl"
		 FROM water_entries
		 WHERE user_id = $1
		   AND water_date BETWEEN $2::date AND $3::date`,
		[userId, range.from, range.to],
	);

	return result.rows[0].totalWaterMl;
}

async function getAverageMood(userId, range) {
	const result = await pool.query(
		`SELECT AVG(mood_score)::numeric AS "averageMoodScore"
		 FROM mood_entries
		 WHERE user_id = $1
		   AND mood_date BETWEEN $2::date AND $3::date`,
		[userId, range.from, range.to],
	);

	return result.rows[0].averageMoodScore;
}

module.exports = {
	getWeightEntries,
	getLatestWeight,
	getProfileHeight,
	getDailyActivity,
	getSleepEntries,
	getNutritionTotals,
	getTotalWater,
	getAverageMood,
};
