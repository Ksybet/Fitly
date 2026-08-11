const express = require('express');
const adminCatalogController = require('./admin-catalog.controller');
const adminFoodController = require('./admin-food.controller');
const {
	validateAdminCatalogQuery,
	validateExerciseId,
	validateCreateExercise,
	validateUpdateExercise,
	validateWorkoutId,
	validateCreateWorkout,
	validateUpdateWorkout,
} = require('./admin-catalog.validators');
const {
	validateAdminFoodQuery,
	validateAdminFoodProductId,
	validateCreateFoodProduct,
	validateUpdateFoodProduct,
} = require('./admin-food.validators');

const router = express.Router();

router.get(
	'/exercises',
	validateAdminCatalogQuery,
	adminCatalogController.listExercises,
);
router.post(
	'/exercises',
	validateCreateExercise,
	adminCatalogController.createExercise,
);
router.get(
	'/exercises/:exerciseId',
	validateExerciseId,
	adminCatalogController.getExercise,
);
router.patch(
	'/exercises/:exerciseId',
	validateExerciseId,
	validateUpdateExercise,
	adminCatalogController.updateExercise,
);
router.delete(
	'/exercises/:exerciseId',
	validateExerciseId,
	adminCatalogController.deleteExercise,
);

router.get(
	'/workouts',
	validateAdminCatalogQuery,
	adminCatalogController.listWorkouts,
);
router.post(
	'/workouts',
	validateCreateWorkout,
	adminCatalogController.createWorkout,
);
router.get(
	'/workouts/:workoutId',
	validateWorkoutId,
	adminCatalogController.getWorkout,
);
router.patch(
	'/workouts/:workoutId',
	validateWorkoutId,
	validateUpdateWorkout,
	adminCatalogController.updateWorkout,
);
router.delete(
	'/workouts/:workoutId',
	validateWorkoutId,
	adminCatalogController.deleteWorkout,
);

router.get(
	'/food-products',
	validateAdminFoodQuery,
	adminFoodController.listFoodProducts,
);
router.post(
	'/food-products',
	validateCreateFoodProduct,
	adminFoodController.createFoodProduct,
);
router.get(
	'/food-products/:productId',
	validateAdminFoodProductId,
	adminFoodController.getFoodProduct,
);
router.patch(
	'/food-products/:productId',
	validateAdminFoodProductId,
	validateUpdateFoodProduct,
	adminFoodController.updateFoodProduct,
);
router.delete(
	'/food-products/:productId',
	validateAdminFoodProductId,
	adminFoodController.deleteFoodProduct,
);

module.exports = router;
