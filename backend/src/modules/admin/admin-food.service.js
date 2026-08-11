const adminFoodRepository = require('./admin-food.repository');
const { toFoodProductDto } = require('../nutrition/nutrition.mapper');
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

async function listFoodProducts(filters) {
	const normalizedFilters = normalizeFilters(filters);
	const result = await adminFoodRepository.listFoodProducts(normalizedFilters);

	return {
		items: result.items.map(toFoodProductDto),
		meta: paginationMeta(
			normalizedFilters.page,
			normalizedFilters.pageSize,
			result.total,
		),
	};
}

async function getFoodProduct(productId) {
	const product = await adminFoodRepository.getFoodProductById(productId);

	if (!product) {
		throw new ApiError(404, 'Food product not found');
	}

	return toFoodProductDto(product);
}

async function createFoodProduct(product) {
	const created = await adminFoodRepository.createFoodProduct(product);
	return toFoodProductDto(created);
}

async function updateFoodProduct(productId, updates) {
	const updated = await adminFoodRepository.updateFoodProduct(
		productId,
		updates,
	);

	if (!updated) {
		throw new ApiError(404, 'Food product not found');
	}

	return toFoodProductDto(updated);
}

async function deleteFoodProduct(productId) {
	const deactivated = await adminFoodRepository.deactivateFoodProduct(productId);

	if (!deactivated) {
		throw new ApiError(404, 'Food product not found');
	}
}

module.exports = {
	DEFAULT_PAGE,
	DEFAULT_PAGE_SIZE,
	normalizeFilters,
	paginationMeta,
	listFoodProducts,
	getFoodProduct,
	createFoodProduct,
	updateFoodProduct,
	deleteFoodProduct,
};
