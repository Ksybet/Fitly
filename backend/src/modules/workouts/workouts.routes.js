const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const workoutsController = require('./workouts.controller');
const {
	validateWorkoutCatalogQuery,
	validateWorkoutId,
} = require('./workouts.validators');

const router = express.Router();

router.get(
	'/catalog',
	authMiddleware,
	validateWorkoutCatalogQuery,
	workoutsController.listWorkoutCatalog,
);
router.get(
	'/catalog/:workoutId',
	authMiddleware,
	validateWorkoutId,
	workoutsController.getWorkout,
);

module.exports = router;
