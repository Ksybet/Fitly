const workoutSessionsService = require('./workout-sessions.service');
const { sendSuccess } = require('../../utils/http-response');

function currentUserId(req) {
	return Number(req.user.userId || req.user.id);
}

async function startWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.startWorkoutSession(
			currentUserId(req),
			req.workoutSessionStartBody,
		);
		return sendSuccess(res, session, { status: 201 });
	} catch (error) {
		return next(error);
	}
}

async function getActiveWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.getActiveWorkoutSession(
			currentUserId(req),
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

async function getWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.getWorkoutSession(
			currentUserId(req),
			req.workoutSessionId,
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

async function pauseWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.pauseWorkoutSession(
			currentUserId(req),
			req.workoutSessionId,
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

async function resumeWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.resumeWorkoutSession(
			currentUserId(req),
			req.workoutSessionId,
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

async function finishWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.finishWorkoutSession(
			currentUserId(req),
			req.workoutSessionId,
			req.workoutSessionFinishBody,
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

async function cancelWorkoutSession(req, res, next) {
	try {
		const session = await workoutSessionsService.cancelWorkoutSession(
			currentUserId(req),
			req.workoutSessionId,
		);
		return sendSuccess(res, session);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	startWorkoutSession,
	getActiveWorkoutSession,
	getWorkoutSession,
	pauseWorkoutSession,
	resumeWorkoutSession,
	finishWorkoutSession,
	cancelWorkoutSession,
};
