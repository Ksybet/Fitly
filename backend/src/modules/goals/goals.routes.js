const express = require('express');
const goalsController = require('./goals.controller');
const { authMiddleware } = require('../auth/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, goalsController.getGoals);
router.put('/', authMiddleware, goalsController.updateGoals);

module.exports = router;
