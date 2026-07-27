const { pool } = require('../../config/db');

const sleepColumns = `
	id,
	sleep_date::text AS date,
	sleep_start AS "sleepStart",
	sleep_end AS "sleepEnd",
	sleep_quality AS "sleepQuality",
	(EXTRACT(EPOCH FROM (sleep_end - sleep_start)) / 60)::integer
		AS "durationMinutes",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function getTodaySleep(userId, date) {
	const result = await pool.query(
		`SELECT ${sleepColumns}
		 FROM sleep_entries
		 WHERE user_id = $1
		   AND sleep_date = $2::date`,
		[userId, date],
	);

	return result.rows[0] || null;
}

async function upsertTodaySleep(userId, date, sleepData) {
	const result = await pool.query(
		`INSERT INTO sleep_entries (
			user_id,
			sleep_date,
			sleep_start,
			sleep_end,
			sleep_quality
		 )
		 VALUES ($1, $2::date, $3, $4, $5)
		 ON CONFLICT (user_id, sleep_date) DO UPDATE
		 SET sleep_start = EXCLUDED.sleep_start,
		     sleep_end = EXCLUDED.sleep_end,
		     sleep_quality = EXCLUDED.sleep_quality,
		     updated_at = CURRENT_TIMESTAMP
		 RETURNING ${sleepColumns}`,
		[
			userId,
			date,
			sleepData.sleepStart,
			sleepData.sleepEnd,
			sleepData.sleepQuality,
		],
	);

	return result.rows[0];
}

module.exports = {
	getTodaySleep,
	upsertTodaySleep,
};
