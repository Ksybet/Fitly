const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const analyticsController = require('./analytics.controller');
const {
	validateAnalyticsPeriodQuery,
} = require('./analytics.validators');

const router = express.Router();

router.get(
	'/weight',
	authMiddleware,
	validateAnalyticsPeriodQuery,
	analyticsController.getWeightAnalytics,
);

router.get(
	'/activity',
	authMiddleware,
	validateAnalyticsPeriodQuery,
	analyticsController.getActivityAnalytics,
);

router.get(
	'/sleep',
	authMiddleware,
	validateAnalyticsPeriodQuery,
	analyticsController.getSleepAnalytics,
);

module.exports = router;
