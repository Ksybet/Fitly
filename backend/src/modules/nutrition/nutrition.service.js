const nutritionRepository = require('./nutrition.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toFoodProductDto } = require('./nutrition.mapper');

function paginationMeta(page, pageSize, total) {
	return {
		page,
		pageSize,
		total,
		totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
	};
}

async function searchProducts(userId, filters) {
	const normalizedUserId = ensureValidUserId(userId);
	const result = await nutritionRepository.searchProducts(
		normalizedUserId,
		filters,
	);

	return {
		items: result.items.map(toFoodProductDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function createCustomProduct(userId, product) {
	const normalizedUserId = ensureValidUserId(userId);
	const created = await nutritionRepository.createCustomProduct(
		normalizedUserId,
		product,
	);

	return toFoodProductDto(created);
}

module.exports = {
	searchProducts,
	createCustomProduct,
	paginationMeta,
};
