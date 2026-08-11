const adminCatalogRepository = require('./admin-catalog.repository');
const { toExerciseDto } = require('../workouts/workouts.mapper');
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
};
