const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const sleepController = require('./sleep.controller');
const {
	validateUpsertTodaySleepRequest,
} = require('./sleep.validators');

const router = express.Router();

router.get('/today', authMiddleware, sleepController.getTodaySleep);
router.put(
	'/today',
	authMiddleware,
	validateUpsertTodaySleepRequest,
	sleepController.updateTodaySleep,
);

module.exports = router;
