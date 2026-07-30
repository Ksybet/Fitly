const nutritionRepository = require('./nutrition.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { ApiError } = require('../../utils/api-error');
const {
	getUserTimezone,
} = require('../settings/user-local-date.service');
const {
	toFoodProductDto,
	toMealEntryDto,
	roundNutritionValue,
} = require('./nutrition.mapper');

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

function calculateNutritionTotal(nutritionPer100g, amountG) {
	return Object.fromEntries(
		Object.entries(nutritionPer100g).map(([key, value]) => [
			key,
			roundNutritionValue((value * amountG) / 100),
		]),
	);
}

async function resolveMealItems(userId, items) {
	const productIds = [...new Set(
		items
			.filter(item => item.productId !== undefined)
			.map(item => item.productId),
	)];
	const products = await nutritionRepository.getAvailableProductsByIds(
		userId,
		productIds,
	);
	const productsById = new Map(
		products.map(product => [Number(product.id), toFoodProductDto(product)]),
	);

	return items.map((item, index) => {
		let productId = null;
		let name = item.name;
		let nutritionPer100g = item.nutritionPer100g;

		if (item.productId !== undefined) {
			const product = productsById.get(item.productId);

			if (!product) {
				throw new ApiError(400, 'Request validation failed', {
					details: [{
						field: `items[${index}].productId`,
						code: 'UNAVAILABLE_PRODUCT',
						message: 'Product is unavailable',
					}],
				});
			}

			productId = product.id;
			name = product.name;
			nutritionPer100g = product.nutritionPer100g;
		}

		return {
			productId,
			name,
			amountG: item.amountG,
			nutritionPer100g,
			nutritionTotal: calculateNutritionTotal(
				nutritionPer100g,
				item.amountG,
			),
		};
	});
}

async function createMeal(userId, meal) {
	const normalizedUserId = ensureValidUserId(userId);
	const items = await resolveMealItems(normalizedUserId, meal.items);
	const timezone = await getUserTimezone(normalizedUserId);
	const record = await nutritionRepository.createMeal(
		normalizedUserId,
		{ ...meal, items },
		timezone,
	);

	return toMealEntryDto(record);
}

async function listMeals(userId, filters) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const result = await nutritionRepository.listMeals(
		normalizedUserId,
		filters,
		timezone,
	);

	return {
		items: result.records.map(toMealEntryDto),
		meta: paginationMeta(filters.page, filters.pageSize, result.total),
	};
}

async function getMeal(userId, mealId) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const record = await nutritionRepository.getMealById(
		normalizedUserId,
		mealId,
		timezone,
	);

	if (!record) {
		throw new ApiError(404, 'Meal not found');
	}

	return toMealEntryDto(record);
}

async function updateMeal(userId, mealId, meal) {
	const normalizedUserId = ensureValidUserId(userId);
	const items = await resolveMealItems(normalizedUserId, meal.items);
	const timezone = await getUserTimezone(normalizedUserId);
	const record = await nutritionRepository.updateMeal(
		normalizedUserId,
		mealId,
		{ ...meal, items },
		timezone,
	);

	if (!record) {
		throw new ApiError(404, 'Meal not found');
	}

	return toMealEntryDto(record);
}

async function deleteMeal(userId, mealId) {
	const normalizedUserId = ensureValidUserId(userId);
	const deleted = await nutritionRepository.deleteMeal(
		normalizedUserId,
		mealId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Meal not found');
	}
}

module.exports = {
	searchProducts,
	createCustomProduct,
	paginationMeta,
	calculateNutritionTotal,
	resolveMealItems,
	createMeal,
	listMeals,
	getMeal,
	updateMeal,
	deleteMeal,
};
