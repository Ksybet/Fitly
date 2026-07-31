const workoutPlansService = require('./workout-plans.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function listWorkoutPlans(req, res, next) {
	try {
		const workoutPlans = await workoutPlansService.listWorkoutPlans(
			currentUserId(req),
			req.workoutPlanQuery,
		);
		return sendSuccess(res, workoutPlans);
	} catch (error) {
		return next(error);
	}
}

async function createWorkoutPlan(req, res, next) {
	try {
		const workoutPlan = await workoutPlansService.createWorkoutPlan(
			currentUserId(req),
			req.workoutPlanBody,
		);
		return sendSuccess(res, workoutPlan, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateWorkoutPlan(req, res, next) {
	try {
		const workoutPlan = await workoutPlansService.updateWorkoutPlan(
			currentUserId(req),
			req.workoutPlanId,
			req.workoutPlanBody,
		);
		return sendSuccess(res, workoutPlan);
	} catch (error) {
		return next(error);
	}
}

async function cancelWorkoutPlan(req, res, next) {
	try {
		const workoutPlan = await workoutPlansService.cancelWorkoutPlan(
			currentUserId(req),
			req.workoutPlanId,
		);
		return sendSuccess(res, workoutPlan);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	currentUserId,
	listWorkoutPlans,
	createWorkoutPlan,
	updateWorkoutPlan,
	cancelWorkoutPlan,
};
