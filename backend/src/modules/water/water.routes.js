const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const waterController = require('./water.controller');
const {
	validateSetTodayWaterRequest,
} = require('./water.validators');

const router = express.Router();

router.get('/today', authMiddleware, waterController.getTodayWater);
router.put(
	'/today',
	authMiddleware,
	validateSetTodayWaterRequest,
	waterController.setTodayWater,
);

module.exports = router;
