const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const analyticsController = require('./analytics.controller');
const {
	validateActivityAnalyticsQuery,
} = require('./analytics.validators');

const router = express.Router();

router.get(
	'/activity',
	authMiddleware,
	validateActivityAnalyticsQuery,
	analyticsController.getActivityAnalytics,
);

module.exports = router;
