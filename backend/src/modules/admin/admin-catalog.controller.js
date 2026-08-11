const adminCatalogService = require('./admin-catalog.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

async function listExercises(req, res, next) {
	try {
		const result = await adminCatalogService.listExercises(
			req.adminCatalogQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getExercise(req, res, next) {
	try {
		const exercise = await adminCatalogService.getExercise(req.exerciseId);
		return sendSuccess(res, exercise);
	} catch (error) {
		return next(error);
	}
}

async function createExercise(req, res, next) {
	try {
		const exercise = await adminCatalogService.createExercise(
			req.adminCatalogBody,
		);
		return sendSuccess(res, exercise, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateExercise(req, res, next) {
	try {
		const exercise = await adminCatalogService.updateExercise(
			req.exerciseId,
			req.adminCatalogBody,
		);
		return sendSuccess(res, exercise);
	} catch (error) {
		return next(error);
	}
}

async function deleteExercise(req, res, next) {
	try {
		await adminCatalogService.deleteExercise(req.exerciseId);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

async function listWorkouts(req, res, next) {
	try {
		const result = await adminCatalogService.listWorkouts(
			req.adminCatalogQuery,
		);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

async function getWorkout(req, res, next) {
	try {
		const workout = await adminCatalogService.getWorkout(req.workoutId);
		return sendSuccess(res, workout);
	} catch (error) {
		return next(error);
	}
}

async function createWorkout(req, res, next) {
	try {
		const workout = await adminCatalogService.createWorkout(
			req.adminCatalogBody,
		);
		return sendSuccess(res, workout, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function updateWorkout(req, res, next) {
	try {
		const workout = await adminCatalogService.updateWorkout(
			req.workoutId,
			req.adminCatalogBody,
		);
		return sendSuccess(res, workout);
	} catch (error) {
		return next(error);
	}
}

async function deleteWorkout(req, res, next) {
	try {
		await adminCatalogService.deleteWorkout(req.workoutId);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	listExercises,
	getExercise,
	createExercise,
	updateExercise,
	deleteExercise,
	listWorkouts,
	getWorkout,
	createWorkout,
	updateWorkout,
	deleteWorkout,
};
