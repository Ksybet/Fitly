const nutritionRepository = require('./nutrition.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { ApiError } = require('../../utils/api-error');
const {
	getUserTimezone,
} = require('../settings/user-local-date.service');
const {
	toFoodProductDto,
	toMealEntryDto,
	toNutritionDayDto,
	nutritionValuesFromRow,
} = require('./nutrition.mapper');
const {
	calculateNutritionTotal,
	addAmounts,
	isAmountAboveMaximum,
} = require('./nutrition.calculator');

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

function mergeCatalogItems(items) {
	const merged = [];
	const catalogItems = new Map();

	for (const [index, item] of items.entries()) {
		if (item.productId === undefined) {
			merged.push({ ...item, sourceIndex: index });
			continue;
		}

		const existing = catalogItems.get(item.productId);

		if (!existing) {
			const normalized = { ...item, sourceIndex: index };
			catalogItems.set(item.productId, normalized);
			merged.push(normalized);
			continue;
		}

		const amount = addAmounts(existing.amountG, item.amountG);

		if (isAmountAboveMaximum(amount)) {
			throw new ApiError(400, 'Request validation failed', {
				details: [{
					field: `items[${index}].amountG`,
					code: 'OUT_OF_RANGE',
					message: 'Combined amountG must not exceed 10000',
				}],
			});
		}

		existing.amountG = amount.toNumber();
	}

	return merged;
}

async function resolveMealItems(userId, items, existingItems = []) {
	const mergedItems = mergeCatalogItems(items);
	const existingProducts = new Map();

	for (const item of existingItems) {
		if (item.productId !== null && item.productId !== undefined) {
			const productId = Number(item.productId);

			if (!existingProducts.has(productId)) {
				existingProducts.set(productId, item);
			}
		}
	}

	const productIds = [...new Set(
		mergedItems
			.filter(item => (
				item.productId !== undefined
				&& !existingProducts.has(item.productId)
			))
			.map(item => item.productId),
	)];
	const products = productIds.length === 0
		? []
		: await nutritionRepository.getAvailableProductsByIds(
			userId,
			productIds,
		);
	const productsById = new Map(
		products.map(product => [Number(product.id), product]),
	);

	return mergedItems.map(item => {
		let productId = null;
		let name = item.name;
		let nutritionPer100g = item.nutritionPer100g;

		if (item.productId !== undefined) {
			const snapshot = existingProducts.get(item.productId);
			const product = productsById.get(item.productId);

			if (snapshot) {
				productId = Number(snapshot.productId);
				name = snapshot.name;
				nutritionPer100g = nutritionValuesFromRow(snapshot, 'per100g');
			} else if (product) {
				productId = Number(product.id);
				name = product.name;
				nutritionPer100g = nutritionValuesFromRow(product);
			} else {
				throw new ApiError(400, 'Request validation failed', {
					details: [{
						field: `items[${item.sourceIndex}].productId`,
						code: 'UNAVAILABLE_PRODUCT',
						message: 'Product is unavailable',
					}],
				});
			}
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
	const timezone = await getUserTimezone(normalizedUserId);
	const current = await nutritionRepository.getMealById(
		normalizedUserId,
		mealId,
		timezone,
	);

	if (!current) {
		throw new ApiError(404, 'Meal not found');
	}

	const items = await resolveMealItems(
		normalizedUserId,
		meal.items,
		current.items,
	);
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

async function getNutritionDay(userId, date) {
	const normalizedUserId = ensureValidUserId(userId);
	const timezone = await getUserTimezone(normalizedUserId);
	const records = await nutritionRepository.getMealsForDate(
		normalizedUserId,
		date,
		timezone,
	);

	return toNutritionDayDto(date, records);
}

module.exports = {
	searchProducts,
	createCustomProduct,
	paginationMeta,
	calculateNutritionTotal,
	resolveMealItems,
	mergeCatalogItems,
	createMeal,
	listMeals,
	getMeal,
	updateMeal,
	deleteMeal,
	getNutritionDay,
};
