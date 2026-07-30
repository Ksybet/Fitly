const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const nutritionController = require('./nutrition.controller');
const {
	validateProductSearchQuery,
	validateCreateProductRequest,
	validateMealListQuery,
	validateMealId,
	validateMealRequest,
} = require('./nutrition.validators');

const router = express.Router();

router.get(
	'/products',
	authMiddleware,
	validateProductSearchQuery,
	nutritionController.searchProducts,
);
router.post(
	'/products',
	authMiddleware,
	validateCreateProductRequest,
	nutritionController.createCustomProduct,
);
router.get(
	'/meals',
	authMiddleware,
	validateMealListQuery,
	nutritionController.listMeals,
);
router.post(
	'/meals',
	authMiddleware,
	validateMealRequest,
	nutritionController.createMeal,
);
router.get(
	'/meals/:mealId',
	authMiddleware,
	validateMealId,
	nutritionController.getMeal,
);
router.patch(
	'/meals/:mealId',
	authMiddleware,
	validateMealId,
	validateMealRequest,
	nutritionController.updateMeal,
);
router.delete(
	'/meals/:mealId',
	authMiddleware,
	validateMealId,
	nutritionController.deleteMeal,
);

module.exports = router;
