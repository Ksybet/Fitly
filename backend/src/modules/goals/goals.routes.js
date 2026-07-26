const express = require('express');
const goalsController = require('./goals.controller');
const { authMiddleware } = require('../auth/auth.middleware');
const { validateReplaceGoalsRequest } = require('./goals.validators');

const router = express.Router();

router.get('/', authMiddleware, goalsController.getGoals);
router.put(
	'/',
	authMiddleware,
	validateReplaceGoalsRequest,
	goalsController.updateGoals,
);

module.exports = router;
