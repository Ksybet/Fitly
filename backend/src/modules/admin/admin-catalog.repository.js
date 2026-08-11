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

async function listWorkouts(filters) {
	const values = [];
	const conditions = [];
	addAdminListFilters(filters, values, conditions);
	const where = conditions.length > 0
		? `WHERE ${conditions.join('\n\t\t AND ')}`
		: '';
	const countResult = await pool.query(
		`SELECT COUNT(*)::integer AS total
		 FROM workouts
		 ${where}`,
		[...values],
	);

	values.push(filters.pageSize);
	const limitParameter = `$${values.length}`;
	values.push((filters.page - 1) * filters.pageSize);
	const offsetParameter = `$${values.length}`;
	const result = await pool.query(
		`SELECT ${workoutColumns}
		 FROM workouts
		 ${where}
		 ORDER BY LOWER(title) ASC, id ASC
		 LIMIT ${limitParameter}
		 OFFSET ${offsetParameter}`,
		values,
	);
	const workoutIds = result.rows.map(workout => Number(workout.id));
	const exercises = await getWorkoutExercises(workoutIds);

	return {
		records: result.rows.map(workout => ({
			workout,
			exercises: exercises.filter(
				exercise => Number(exercise.workoutId) === Number(workout.id),
			),
		})),
		total: countResult.rows[0].total,
	};
}

async function getWorkoutById(workoutId, queryable = pool) {
	const result = await queryable.query(
		`SELECT ${workoutColumns}
		 FROM workouts
		 WHERE id = $1`,
		[workoutId],
	);
	return result.rows[0] || null;
}

async function getWorkoutExercises(workoutIds, queryable = pool) {
	if (workoutIds.length === 0) {
		return [];
	}
	const result = await queryable.query(
		`SELECT
			we.workout_id AS "workoutId",
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
		 WHERE we.workout_id = ANY($1::integer[])
		 ORDER BY we.workout_id ASC, we.sort_order ASC, we.exercise_id ASC`,
		[workoutIds],
	);
	return result.rows;
}

async function getExercisesByIds(exerciseIds) {
	if (exerciseIds.length === 0) {
		return [];
	}
	const result = await pool.query(
		`SELECT id, is_active AS "isActive"
		 FROM exercises
		 WHERE id = ANY($1::integer[])`,
		[exerciseIds],
	);
	return result.rows;
}

async function insertWorkoutExercises(client, workoutId, exercises) {
	for (const exercise of exercises) {
		await client.query(
			`INSERT INTO workout_exercises (
				workout_id,
				exercise_id,
				sort_order,
				sets,
				repetitions,
				duration_seconds,
				rest_seconds
			 )
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				workoutId,
				exercise.exerciseId,
				exercise.order,
				exercise.sets ?? null,
				exercise.repetitions ?? null,
				exercise.durationSeconds ?? null,
				exercise.restSeconds ?? null,
			],
		);
	}
}

async function createWorkout(workout) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const result = await client.query(
			`INSERT INTO workouts (
				title,
				description,
				type,
				body_area,
				intensity,
				duration_minutes,
				estimated_calories,
				image_url,
				is_active
			 )
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING ${workoutColumns}`,
			[
				workout.title,
				workout.description,
				workout.type,
				workout.bodyArea,
				workout.intensity,
				workout.durationMinutes,
				workout.estimatedCalories,
				workout.imageUrl ?? null,
				workout.isActive ?? true,
			],
		);
		const created = result.rows[0];
		await insertWorkoutExercises(client, created.id, workout.exercises);
		const exercises = await getWorkoutExercises([created.id], client);
		await client.query('COMMIT');
		return { workout: created, exercises };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

const workoutUpdateColumns = Object.freeze({
	title: 'title',
	description: 'description',
	type: 'type',
	bodyArea: 'body_area',
	intensity: 'intensity',
	durationMinutes: 'duration_minutes',
	estimatedCalories: 'estimated_calories',
	imageUrl: 'image_url',
	isActive: 'is_active',
});

async function updateWorkout(workoutId, updates) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const values = [workoutId];
		const assignments = [];
		for (const [field, column] of Object.entries(workoutUpdateColumns)) {
			if (updates[field] !== undefined) {
				values.push(updates[field]);
				assignments.push(`${column} = $${values.length}`);
			}
		}
		assignments.push('updated_at = CURRENT_TIMESTAMP');
		const result = await client.query(
			`UPDATE workouts
			 SET ${assignments.join(',\n\t\t\t     ')}
			 WHERE id = $1
			 RETURNING ${workoutColumns}`,
			values,
		);
		const updated = result.rows[0];
		if (!updated) {
			await client.query('ROLLBACK');
			return null;
		}
		if (updates.exercises !== undefined) {
			await client.query(
				'DELETE FROM workout_exercises WHERE workout_id = $1',
				[workoutId],
			);
			await insertWorkoutExercises(client, workoutId, updates.exercises);
		}
		const exercises = await getWorkoutExercises([workoutId], client);
		await client.query('COMMIT');
		return { workout: updated, exercises };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

async function deactivateWorkout(workoutId) {
	const result = await pool.query(
		`UPDATE workouts
		 SET is_active = FALSE,
		     updated_at = CASE
		       WHEN is_active = TRUE THEN CURRENT_TIMESTAMP
		       ELSE updated_at
		     END
		 WHERE id = $1
		 RETURNING id`,
		[workoutId],
	);
	return Boolean(result.rows[0]);
}

module.exports = {
	listExercises,
	getExerciseById,
	createExercise,
	updateExercise,
	deactivateExercise,
	listWorkouts,
	getWorkoutById,
	getWorkoutExercises,
	getExercisesByIds,
	createWorkout,
	updateWorkout,
	deactivateWorkout,
};
