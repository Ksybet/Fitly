const workoutsRepository = require('./workouts.repository');
const {
	toWorkoutSummaryDto,
	toWorkoutDto,
} = require('./workouts.mapper');
const { ApiError } = require('../../utils/api-error');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function normalizeFilters(filters = {}) {
	return {
		type: filters.type,
		bodyArea: filters.bodyArea,
		intensity: filters.intensity,
		maxDurationMinutes: filters.maxDurationMinutes,
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

async function listWorkoutCatalog(filters) {
	const normalizedFilters = normalizeFilters(filters);
	const result = await workoutsRepository.listActiveWorkouts(
		normalizedFilters,
	);

	return {
		items: result.items.map(toWorkoutSummaryDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getWorkout(workoutId) {
	const workout = await workoutsRepository.getActiveWorkoutById(workoutId);

	if (!workout) {
		throw new ApiError(404, 'Workout not found');
	}

	const exerciseRecords =
		await workoutsRepository.getWorkoutExercises(workoutId);
	const sortedExercises = [...exerciseRecords]
		.sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));

	return toWorkoutDto(workout, sortedExercises);
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	normalizeFilters,
	paginationMeta,
	listWorkoutCatalog,
	getWorkout,
};
