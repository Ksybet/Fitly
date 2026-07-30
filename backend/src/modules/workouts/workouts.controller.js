const workoutsService = require('./workouts.service');
const { sendSuccess } = require('../../utils/http-response');

async function listWorkoutCatalog(req, res, next) {
	try {
		const result = await workoutsService.listWorkoutCatalog(
			req.workoutQuery,
		);

		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getWorkout(req, res, next) {
	try {
		const workout = await workoutsService.getWorkout(req.workoutId);
		return sendSuccess(res, workout);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listWorkoutCatalog,
	getWorkout,
};
