const adminCatalogRepository = require('./admin-catalog.repository');
const {
	toExerciseDto,
	toWorkoutDto,
} = require('../workouts/workouts.mapper');
const { ApiError } = require('../../utils/api-error');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function normalizeFilters(filters = {}) {
	return {
		query: filters.query,
		active: filters.active,
		page: filters.page ?? DEFAULT_PAGE,
		pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
	};
}

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function listExercises(filters) {
	const normalizedFilters = normalizeFilters(filters);
	const result = await adminCatalogRepository.listExercises(
		normalizedFilters,
	);

	return {
		items: result.items.map(toExerciseDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getExercise(exerciseId) {
	const exercise = await adminCatalogRepository.getExerciseById(exerciseId);
	if (!exercise) {
		throw new ApiError(404, 'Exercise not found');
	}
	return toExerciseDto(exercise);
}

async function createExercise(exercise) {
	const created = await adminCatalogRepository.createExercise(exercise);
	return toExerciseDto(created);
}

async function updateExercise(exerciseId, updates) {
	const updated = await adminCatalogRepository.updateExercise(
		exerciseId,
		updates,
	);
	if (!updated) {
		throw new ApiError(404, 'Exercise not found');
	}
	return toExerciseDto(updated);
}

async function deleteExercise(exerciseId) {
	const deactivated = await adminCatalogRepository.deactivateExercise(
		exerciseId,
	);
	if (!deactivated) {
		throw new ApiError(404, 'Exercise not found');
	}
}

function toWorkoutRecordDto(record) {
	return toWorkoutDto(record.workout, record.exercises);
}

async function listWorkouts(filters) {
	const normalizedFilters = normalizeFilters(filters);
	const result = await adminCatalogRepository.listWorkouts(
		normalizedFilters,
	);
	return {
		items: result.records.map(toWorkoutRecordDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getWorkoutRecord(workoutId) {
	const workout = await adminCatalogRepository.getWorkoutById(workoutId);
	if (!workout) {
		throw new ApiError(404, 'Workout not found');
	}
	const exercises = await adminCatalogRepository.getWorkoutExercises([
		workoutId,
	]);
	return { workout, exercises };
}

async function getWorkout(workoutId) {
	return toWorkoutRecordDto(await getWorkoutRecord(workoutId));
}

function duplicateCompositionDetails(exercises) {
	const details = [];
	const exerciseIndexes = new Map();
	const orderIndexes = new Map();
	exercises.forEach((exercise, index) => {
		if (exerciseIndexes.has(exercise.exerciseId)) {
			details.push({
				field: `exercises[${index}].exerciseId`,
				code: 'DUPLICATE',
				message: 'exerciseId must be unique within a workout',
			});
		} else {
			exerciseIndexes.set(exercise.exerciseId, index);
		}
		if (orderIndexes.has(exercise.order)) {
			details.push({
				field: `exercises[${index}].order`,
				code: 'DUPLICATE',
				message: 'order must be unique within a workout',
			});
		} else {
			orderIndexes.set(exercise.order, index);
		}
	});
	return details;
}

async function validateWorkoutComposition(exercises, requireActive) {
	const details = duplicateCompositionDetails(exercises);
	const exerciseIds = [...new Set(exercises.map(item => item.exerciseId))];
	const records = await adminCatalogRepository.getExercisesByIds(exerciseIds);
	const recordsById = new Map(
		records.map(exercise => [Number(exercise.id), exercise]),
	);
	exercises.forEach((exercise, index) => {
		const record = recordsById.get(Number(exercise.exerciseId));
		if (!record) {
			details.push({
				field: `exercises[${index}].exerciseId`,
				code: 'NOT_FOUND',
				message: 'Referenced exercise does not exist',
			});
		} else if (requireActive && !record.isActive) {
			details.push({
				field: `exercises[${index}].exerciseId`,
				code: 'INACTIVE_RESOURCE',
				message: 'An active workout may contain only active exercises',
			});
		}
	});
	if (details.length > 0) {
		throw new ApiError(400, 'Request validation failed', { details });
	}
}

async function createWorkout(workout) {
	await validateWorkoutComposition(
		workout.exercises,
		workout.isActive ?? true,
	);
	const created = await adminCatalogRepository.createWorkout(workout);
	return toWorkoutRecordDto(created);
}

async function updateWorkout(workoutId, updates) {
	const current = await getWorkoutRecord(workoutId);
	const nextActive = updates.isActive ?? current.workout.isActive;
	if (updates.exercises !== undefined) {
		await validateWorkoutComposition(updates.exercises, nextActive);
	} else if (updates.isActive === true && current.workout.isActive === false) {
		await validateWorkoutComposition(
			current.exercises.map(exercise => ({
				exerciseId: Number(exercise.exerciseId),
				order: Number(exercise.sortOrder),
			})),
			true,
		);
	}
	const updated = await adminCatalogRepository.updateWorkout(
		workoutId,
		updates,
	);
	if (!updated) {
		throw new ApiError(404, 'Workout not found');
	}
	return toWorkoutRecordDto(updated);
}

async function deleteWorkout(workoutId) {
	const deactivated = await adminCatalogRepository.deactivateWorkout(workoutId);
	if (!deactivated) {
		throw new ApiError(404, 'Workout not found');
	}
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	normalizeFilters,
	paginationMeta,
	listExercises,
	getExercise,
	createExercise,
	updateExercise,
	deleteExercise,
	listWorkouts,
	getWorkout,
	createWorkout,
	updateWorkout,
	deleteWorkout,
};
