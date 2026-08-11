const { pool } = require('../../config/db');

const exerciseColumns = `
	id,
	title,
	description,
	type,
	body_area AS "bodyArea",
	intensity,
	instructions,
	media,
	is_active AS "isActive",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

function addAdminListFilters(filters, values, conditions) {
	if (filters.query) {
		values.push(`%${filters.query}%`);
		conditions.push(`title ILIKE $${values.length}`);
	}

	if (filters.active !== undefined) {
		values.push(filters.active);
		conditions.push(`is_active = $${values.length}`);
	}
}

async function listExercises(filters) {
	const values = [];
	const conditions = [];
	addAdminListFilters(filters, values, conditions);
	const where = conditions.length > 0
		? `WHERE ${conditions.join('\n\t\t AND ')}`
		: '';
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM exercises
		 ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${exerciseColumns}
		 FROM exercises
		 ${where}
		 ORDER BY LOWER(title) ASC, id ASC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: result.rows,
		total: countResult.rows[0].total,
	};
}

async function getExerciseById(exerciseId, queryable = pool) {
	const result = await queryable.query(
		`SELECT ${exerciseColumns}
		 FROM exercises
		 WHERE id = $1`,
		[exerciseId],
	);

	return result.rows[0] || null;
}

async function createExercise(exercise) {
	const result = await pool.query(
		`INSERT INTO exercises (
			title,
			description,
			type,
			body_area,
			intensity,
			instructions,
			media,
			is_active
		 )
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
		 RETURNING ${exerciseColumns}`,
		[
			exercise.title,
			exercise.description,
			exercise.type,
			exercise.bodyArea,
			exercise.intensity,
			JSON.stringify(exercise.instructions),
			JSON.stringify(exercise.media || []),
			exercise.isActive ?? true,
		],
	);

	return result.rows[0];
}

const exerciseUpdateColumns = Object.freeze({
	title: 'title',
	description: 'description',
	type: 'type',
	bodyArea: 'body_area',
	intensity: 'intensity',
	instructions: 'instructions',
	media: 'media',
	isActive: 'is_active',
});

async function updateExercise(exerciseId, updates) {
	const values = [exerciseId];
	const assignments = [];

	for (const [field, column] of Object.entries(exerciseUpdateColumns)) {
		if (updates[field] === undefined) {
			continue;
		}

		let value = updates[field];
		if (field === 'instructions' || field === 'media') {
			value = JSON.stringify(value);
		}
		values.push(value);
		const cast = field === 'instructions' || field === 'media' ? '::jsonb' : '';
		assignments.push(`${column} = $${values.length}${cast}`);
	}

	assignments.push('updated_at = CURRENT_TIMESTAMP');
	const result = await pool.query(
		`UPDATE exercises
		 SET ${assignments.join(',\n\t\t     ')}
		 WHERE id = $1
		 RETURNING ${exerciseColumns}`,
		values,
	);

	return result.rows[0] || null;
}

async function deactivateExercise(exerciseId) {
	const result = await pool.query(
		`UPDATE exercises
		 SET is_active = FALSE,
		     updated_at = CASE
		       WHEN is_active = TRUE THEN CURRENT_TIMESTAMP
		       ELSE updated_at
		     END
		 WHERE id = $1
		 RETURNING id`,
		[exerciseId],
	);

	return Boolean(result.rows[0]);
}

module.exports = {
	listExercises,
	getExerciseById,
	createExercise,
	updateExercise,
	deactivateExercise,
};
