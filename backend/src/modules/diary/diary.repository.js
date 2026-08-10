const { pool } = require('../../config/db');

const diaryColumns = `
	id,
	recorded_at AS "recordedAt",
	TO_CHAR(recorded_at AT TIME ZONE $2, 'YYYY-MM-DD') AS date,
	mood_score AS "moodScore",
	energy_level AS "energyLevel",
	stress_level AS "stressLevel",
	tags,
	symptoms,
	note,
	input_method AS "inputMethod",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function createEntry(userId, entry, timezone) {
	const result = await pool.query(
		`INSERT INTO diary_entries (
			user_id,
			recorded_at,
			mood_score,
			energy_level,
			stress_level,
			tags,
			symptoms,
			note,
			input_method
		 ) VALUES ($1, $3, $4, $5, $6, $7, $8, $9, 'manual')
		 RETURNING ${diaryColumns}`,
		[
			userId,
			timezone,
			entry.recordedAt,
			entry.moodScore,
			entry.energyLevel,
			entry.stressLevel,
			entry.tags,
			entry.symptoms,
			entry.note,
		],
	);

	return result.rows[0];
}

function addDateFilters(conditions, values, filters) {
	if (filters.from) {
		values.push(filters.from);
		conditions.push(
			`recorded_at >= ($${values.length}::date::timestamp AT TIME ZONE $2)`,
		);
	}

	if (filters.to) {
		values.push(filters.to);
		conditions.push(
			`recorded_at < (
				($${values.length}::date + 1)::timestamp AT TIME ZONE $2
			 )`,
		);
	}
}

async function listEntries(userId, filters, timezone) {
	const conditions = ['user_id = $1', '$2::text IS NOT NULL'];
	const values = [userId, timezone];

	addDateFilters(conditions, values, filters);

	if (filters.moodScore !== undefined) {
		values.push(filters.moodScore);
		conditions.push(`mood_score = $${values.length}`);
	}

	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM diary_entries
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${diaryColumns}
		 FROM diary_entries
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

async function getEntryById(userId, entryId, timezone) {
	const result = await pool.query(
		`SELECT ${diaryColumns}
		 FROM diary_entries
		 WHERE user_id = $1
		   AND id = $3`,
		[userId, timezone, entryId],
	);

	return result.rows[0] || null;
}

async function updateEntry(userId, entryId, patch, timezone) {
	const values = [userId, timezone, entryId];
	const assignments = [];
	const fields = [
		['recordedAt', 'recorded_at'],
		['moodScore', 'mood_score'],
		['energyLevel', 'energy_level'],
		['stressLevel', 'stress_level'],
		['tags', 'tags'],
		['symptoms', 'symptoms'],
		['note', 'note'],
	];

	for (const [field, column] of fields) {
		if (Object.prototype.hasOwnProperty.call(patch, field)) {
			values.push(patch[field]);
			assignments.push(`${column} = $${values.length}`);
		}
	}

	assignments.push('updated_at = CURRENT_TIMESTAMP');
	const result = await pool.query(
		`UPDATE diary_entries
		 SET ${assignments.join(',\n\t\t     ')}
		 WHERE user_id = $1
		   AND id = $3
		 RETURNING ${diaryColumns}`,
		values,
	);

	return result.rows[0] || null;
}

async function deleteEntry(userId, entryId) {
	const result = await pool.query(
		`DELETE FROM diary_entries
		 WHERE user_id = $1
		   AND id = $2
		 RETURNING id`,
		[userId, entryId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	createEntry,
	listEntries,
	getEntryById,
	updateEntry,
	deleteEntry,
};
