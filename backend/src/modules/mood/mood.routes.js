const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const moodController = require('./mood.controller');
const {
	validateUpsertTodayMoodRequest,
} = require('./mood.validators');

const router = express.Router();

router.get('/today', authMiddleware, moodController.getTodayMood);
router.put(
	'/today',
	authMiddleware,
	validateUpsertTodayMoodRequest,
	moodController.updateTodayMood,
);

module.exports = router;
