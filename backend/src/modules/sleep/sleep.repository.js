const { pool } = require('../../config/db');

const sleepColumns = `
	id,
	user_id AS "userId",
	sleep_date AS "sleepDate",
	started_at AS "sleepStart",
	ended_at AS "sleepEnd",
	duration_hours AS "sleepHours",
	duration_minutes AS "sleepMinutes",
	quality AS "sleepQuality",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getTodaySleep(userId) {
	const result = await pool.query(
		`SELECT ${sleepColumns}
		 FROM sleep_entries
		 WHERE user_id = $1
		   AND sleep_date = CURRENT_DATE`,
		[userId],
	);

	return result.rows[0] || null;
}

async function upsertTodaySleep(userId, sleepData) {
	const result = await pool.query(
		`INSERT INTO sleep_entries (
			user_id, sleep_date, started_at, ended_at,
			duration_hours, duration_minutes, quality
		 )
		 VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
		 ON CONFLICT (user_id, sleep_date)
		 DO UPDATE SET
			started_at = EXCLUDED.started_at,
			ended_at = EXCLUDED.ended_at,
			duration_hours = EXCLUDED.duration_hours,
			duration_minutes = EXCLUDED.duration_minutes,
			quality = EXCLUDED.quality,
			updated_at = CURRENT_TIMESTAMP
		 RETURNING ${sleepColumns}`,
		[
			userId,
			sleepData.sleepStart,
			sleepData.sleepEnd,
			sleepData.sleepHours,
			sleepData.sleepMinutes,
			sleepData.sleepQuality || null,
		],
	);

	return result.rows[0];
}

module.exports = {
	getTodaySleep,
	upsertTodaySleep,
};
