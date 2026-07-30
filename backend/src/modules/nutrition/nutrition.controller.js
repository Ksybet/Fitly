const nutritionService = require('./nutrition.service');
const {
	sendSuccess,
	sendDeleted,
} = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function searchProducts(req, res, next) {
	try {
		const result = await nutritionService.searchProducts(
			currentUserId(req),
			req.nutritionQuery,
		);

		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function createCustomProduct(req, res, next) {
	try {
		const product = await nutritionService.createCustomProduct(
			currentUserId(req),
			req.nutritionBody,
		);

		return sendSuccess(res, product, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function listMeals(req, res, next) {
	try {
		const result = await nutritionService.listMeals(
			currentUserId(req),
			req.nutritionQuery,
		);

		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function createMeal(req, res, next) {
	try {
		const meal = await nutritionService.createMeal(
			currentUserId(req),
			req.nutritionBody,
		);

		return sendSuccess(res, meal, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function getMeal(req, res, next) {
	try {
		const meal = await nutritionService.getMeal(
			currentUserId(req),
			req.mealId,
		);

		return sendSuccess(res, meal);
	} catch (error) {
		return next(error);
	}
}

async function updateMeal(req, res, next) {
	try {
		const meal = await nutritionService.updateMeal(
			currentUserId(req),
			req.mealId,
			req.nutritionBody,
		);

		return sendSuccess(res, meal);
	} catch (error) {
		return next(error);
	}
}

async function deleteMeal(req, res, next) {
	try {
		await nutritionService.deleteMeal(currentUserId(req), req.mealId);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

async function getNutritionDay(req, res, next) {
	try {
		const day = await nutritionService.getNutritionDay(
			currentUserId(req),
			req.nutritionDate,
		);

		return sendSuccess(res, day);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	searchProducts,
	createCustomProduct,
	currentUserId,
	listMeals,
	createMeal,
	getMeal,
	updateMeal,
	deleteMeal,
	getNutritionDay,
};
