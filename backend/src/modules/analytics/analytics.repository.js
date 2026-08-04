const { pool } = require('../../config/db');

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

module.exports = {
	getDailyActivity,
};
