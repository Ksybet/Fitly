const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const workoutPlansController = require('./workout-plans.controller');
const {
	validateWorkoutPlanListQuery,
	validateWorkoutPlanId,
	validateWorkoutPlanRequest,
} = require('./workout-plans.validators');

const router = express.Router();

router.get(
	'/',
	authMiddleware,
	validateWorkoutPlanListQuery,
	workoutPlansController.listWorkoutPlans,
);
router.post(
	'/',
	authMiddleware,
	validateWorkoutPlanRequest,
	workoutPlansController.createWorkoutPlan,
);
router.patch(
	'/:planId',
	authMiddleware,
	validateWorkoutPlanId,
	validateWorkoutPlanRequest,
	workoutPlansController.updateWorkoutPlan,
);
router.delete(
	'/:planId',
	authMiddleware,
	validateWorkoutPlanId,
	workoutPlansController.cancelWorkoutPlan,
);

module.exports = router;
