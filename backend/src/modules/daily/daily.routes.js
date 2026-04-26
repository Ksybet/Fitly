const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const controller = require('./daily.controller');

const router = express.Router();

router.get('/today', authMiddleware, controller.getToday);
router.put('/today', authMiddleware, controller.updateToday);

module.exports = router;
