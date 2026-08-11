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

function addDateFilters(conditions, values, filters) {
	if (filters.from) {
		values.push(filters.from);
		conditions.push(`sleep_date >= $${values.length}::date`);
	}

	if (filters.to) {
		values.push(filters.to);
		conditions.push(`sleep_date <= $${values.length}::date`);
	}
}

async function listEntries(userId, filters) {
	const conditions = ['user_id = $1'];
	const values = [userId];
	addDateFilters(conditions, values, filters);
	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM sleep_entries
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${sleepColumns}
		 FROM sleep_entries
		 WHERE ${where}
		 ORDER BY sleep_date DESC, id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		entries: result.rows,
		total: countResult.rows[0].total,
	};
}

async function createEntry(userId, date, sleepData) {
	const result = await pool.query(
		`INSERT INTO sleep_entries (
			user_id,
			sleep_date,
			sleep_start,
			sleep_end,
			sleep_quality
		 ) VALUES ($1, $2::date, $3, $4, $5)
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

async function updateEntry(userId, entryId, date, sleepData) {
	const result = await pool.query(
		`UPDATE sleep_entries
		 SET sleep_date = $3::date,
		     sleep_start = $4,
		     sleep_end = $5,
		     sleep_quality = $6,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1 AND id = $2
		 RETURNING ${sleepColumns}`,
		[
			userId,
			entryId,
			date,
			sleepData.sleepStart,
			sleepData.sleepEnd,
			sleepData.sleepQuality,
		],
	);

	return result.rows[0] || null;
}

async function deleteEntry(userId, entryId) {
	const result = await pool.query(
		`DELETE FROM sleep_entries
		 WHERE user_id = $1 AND id = $2
		 RETURNING id`,
		[userId, entryId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	getTodaySleep,
	upsertTodaySleep,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
