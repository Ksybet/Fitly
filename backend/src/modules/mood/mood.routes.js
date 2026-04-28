const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const moodController = require('./mood.controller');

const router = express.Router();

router.get('/today', authMiddleware, moodController.getTodayMood);
router.put('/today', authMiddleware, moodController.updateTodayMood);

module.exports = router;
