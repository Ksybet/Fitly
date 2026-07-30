const { pool } = require('../../config/db');

const workoutColumns = `
	id,
	title,
	description,
	type,
	body_area AS "bodyArea",
	intensity,
	duration_minutes AS "durationMinutes",
	estimated_calories AS "estimatedCalories",
	image_url AS "imageUrl",
	is_active AS "isActive",
	created_at AS "createdAt",
	updated_at AS "updatedAt"
`;

async function listActiveWorkouts(filters) {
	const conditions = ['is_active = TRUE'];
	const values = [];

	for (const [field, column] of [
		['type', 'type'],
		['bodyArea', 'body_area'],
		['intensity', 'intensity'],
	]) {
		if (filters[field] !== undefined) {
			values.push(filters[field]);
			conditions.push(`${column} = $${values.length}`);
		}
	}

	if (filters.maxDurationMinutes !== undefined) {
		values.push(filters.maxDurationMinutes);
		conditions.push(`duration_minutes <= $${values.length}`);
	}

	const where = conditions.join('\n\t\t AND ');
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM workouts
		 WHERE ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${workoutColumns}
		 FROM workouts
		 WHERE ${where}
		 ORDER BY title ASC, id ASC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);

	return {
		items: result.rows,
		total: countResult.rows[0].total,
	};
}

async function getActiveWorkoutById(workoutId) {
	const result = await pool.query(
		`SELECT ${workoutColumns}
		 FROM workouts
		 WHERE id = $1
		   AND is_active = TRUE`,
		[workoutId],
	);

	return result.rows[0] || null;
}

async function getWorkoutExercises(workoutId) {
	const result = await pool.query(
		`SELECT
			we.exercise_id AS "exerciseId",
			we.sort_order AS "sortOrder",
			we.sets,
			we.repetitions,
			we.duration_seconds AS "durationSeconds",
			we.rest_seconds AS "restSeconds",
			e.id,
			e.title,
			e.description,
			e.type,
			e.body_area AS "bodyArea",
			e.intensity,
			e.instructions,
			e.media,
			e.is_active AS "isActive",
			e.created_at AS "createdAt",
			e.updated_at AS "updatedAt"
		 FROM workout_exercises we
		 JOIN exercises e ON e.id = we.exercise_id
		 WHERE we.workout_id = $1
		 ORDER BY we.sort_order ASC, we.exercise_id ASC`,
		[workoutId],
	);

	return result.rows;
}

module.exports = {
	listActiveWorkouts,
	getActiveWorkoutById,
	getWorkoutExercises,
};
