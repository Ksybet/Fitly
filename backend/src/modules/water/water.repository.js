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

const waterEntryColumns = `
	id,
	amount_ml AS "amountMl",
	recorded_at AS "consumedAt",
	water_date::text AS date,
	created_at AS "createdAt"
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

function addDateFilters(conditions, values, filters) {
	if (filters.from) {
		values.push(filters.from);
		conditions.push(`water_date >= $${values.length}::date`);
	}

	if (filters.to) {
		values.push(filters.to);
		conditions.push(`water_date <= $${values.length}::date`);
	}
}

async function listEntries(userId, filters) {
	const conditions = ['user_id = $1'];
	const values = [userId];
	addDateFilters(conditions, values, filters);
	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM water_entries
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${waterEntryColumns}
		 FROM water_entries
		 WHERE ${where}
		 ORDER BY recorded_at DESC, id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		entries: result.rows,
		total: countResult.rows[0].total,
	};
}

async function createEntry(userId, date, entry) {
	const result = await pool.query(
		`INSERT INTO water_entries (
			user_id,
			water_date,
			amount_ml,
			recorded_at
		 ) VALUES ($1, $2::date, $3, $4)
		 RETURNING ${waterEntryColumns}`,
		[userId, date, entry.amountMl, entry.consumedAt],
	);

	return result.rows[0];
}

async function updateEntry(userId, entryId, date, entry) {
	const result = await pool.query(
		`UPDATE water_entries
		 SET amount_ml = $4,
		     water_date = COALESCE($3::date, water_date),
		     recorded_at = COALESCE($5::timestamptz, recorded_at)
		 WHERE user_id = $1 AND id = $2
		 RETURNING ${waterEntryColumns}`,
		[userId, entryId, date, entry.amountMl, entry.consumedAt ?? null],
	);

	return result.rows[0] || null;
}

async function deleteEntry(userId, entryId) {
	const result = await pool.query(
		`DELETE FROM water_entries
		 WHERE user_id = $1 AND id = $2
		 RETURNING id`,
		[userId, entryId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	getTodayWater,
	setTodayWater,
	listEntries,
	createEntry,
	updateEntry,
	deleteEntry,
};
