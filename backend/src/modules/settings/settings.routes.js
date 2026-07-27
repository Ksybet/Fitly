const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const settingsController = require('./settings.controller');
const {
	validateUpdateSettingsRequest,
} = require('./settings.validators');

const router = express.Router();

router.get('/', authMiddleware, settingsController.getSettings);
router.patch(
	'/',
	authMiddleware,
	validateUpdateSettingsRequest,
	settingsController.updateSettings,
);

module.exports = router;
