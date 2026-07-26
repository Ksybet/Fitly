const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const controller = require('./daily.controller');
const { validateUpdateTodayRequest } = require('./daily.validators');

const router = express.Router();

router.get('/today', authMiddleware, controller.getToday);
router.put(
	'/today',
	authMiddleware,
	validateUpdateTodayRequest,
	controller.updateToday,
);

module.exports = router;
