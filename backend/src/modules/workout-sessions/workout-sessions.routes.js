const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const workoutSessionsController = require('./workout-sessions.controller');
const {
	validateWorkoutSessionId,
	validateWorkoutSessionListQuery,
	validateStartWorkoutSession,
	validateFinishWorkoutSession,
} = require('./workout-sessions.validators');

const router = express.Router();

router.get(
	'/',
	authMiddleware,
	validateWorkoutSessionListQuery,
	workoutSessionsController.listWorkoutSessions,
);
router.post(
	'/',
	authMiddleware,
	validateStartWorkoutSession,
	workoutSessionsController.startWorkoutSession,
);
router.get(
	'/active',
	authMiddleware,
	workoutSessionsController.getActiveWorkoutSession,
);
router.get(
	'/:sessionId',
	authMiddleware,
	validateWorkoutSessionId,
	workoutSessionsController.getWorkoutSession,
);
router.post(
	'/:sessionId/pause',
	authMiddleware,
	validateWorkoutSessionId,
	workoutSessionsController.pauseWorkoutSession,
);
router.post(
	'/:sessionId/resume',
	authMiddleware,
	validateWorkoutSessionId,
	workoutSessionsController.resumeWorkoutSession,
);
router.post(
	'/:sessionId/finish',
	authMiddleware,
	validateWorkoutSessionId,
	validateFinishWorkoutSession,
	workoutSessionsController.finishWorkoutSession,
);
router.post(
	'/:sessionId/cancel',
	authMiddleware,
	validateWorkoutSessionId,
	workoutSessionsController.cancelWorkoutSession,
);

module.exports = router;
