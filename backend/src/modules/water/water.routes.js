const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const waterController = require('./water.controller');

const router = express.Router();

router.get('/today', authMiddleware, waterController.getTodayWater);
router.post('/today', authMiddleware, waterController.addWater);
router.delete('/today', authMiddleware, waterController.resetTodayWater);

module.exports = router;
