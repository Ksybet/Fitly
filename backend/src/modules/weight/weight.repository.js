const { pool } = require('../../config/db');

const weightColumns = `
	id,
	entry_date::text AS date,
	weight_kg::double precision AS "weightKg",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

function addDateFilters(conditions, values, filters) {
	if (filters.from) {
		values.push(filters.from);
		conditions.push(`entry_date >= $${values.length}::date`);
	}

	if (filters.to) {
		values.push(filters.to);
		conditions.push(`entry_date <= $${values.length}::date`);
	}
}

async function listEntries(userId, filters) {
	const conditions = ['user_id = $1'];
	const values = [userId];
	addDateFilters(conditions, values, filters);
	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM weight_entries
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${weightColumns}
		 FROM weight_entries
		 WHERE ${where}
		 ORDER BY entry_date DESC, id DESC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		entries: result.rows,
		total: countResult.rows[0].total,
	};
}

async function createEntry(userId, entry) {
	const result = await pool.query(
		`INSERT INTO weight_entries (user_id, entry_date, weight_kg)
		 VALUES ($1, $2::date, $3)
		 RETURNING ${weightColumns}`,
		[userId, entry.date, entry.weightKg],
	);

	return result.rows[0];
}

async function getEntryById(userId, entryId) {
	const result = await pool.query(
		`SELECT ${weightColumns}
		 FROM weight_entries
		 WHERE user_id = $1 AND id = $2`,
		[userId, entryId],
	);

	return result.rows[0] || null;
}

async function updateEntry(userId, entryId, entry) {
	const result = await pool.query(
		`UPDATE weight_entries
		 SET entry_date = $3::date,
		     weight_kg = $4,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE user_id = $1 AND id = $2
		 RETURNING ${weightColumns}`,
		[userId, entryId, entry.date, entry.weightKg],
	);

	return result.rows[0] || null;
}

async function deleteEntry(userId, entryId) {
	const result = await pool.query(
		`DELETE FROM weight_entries
		 WHERE user_id = $1 AND id = $2
		 RETURNING id`,
		[userId, entryId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	listEntries,
	createEntry,
	getEntryById,
	updateEntry,
	deleteEntry,
};
