const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const achievementsController = require('./achievements.controller');
const {
	validateAchievementsQuery,
	validateAchievementId,
} = require('./achievements.validators');

const router = express.Router();

router.get(
	'/',
	authMiddleware,
	validateAchievementsQuery,
	achievementsController.listAchievements,
);
router.get(
	'/:achievementId',
	authMiddleware,
	validateAchievementId,
	achievementsController.getAchievement,
);

module.exports = router;
