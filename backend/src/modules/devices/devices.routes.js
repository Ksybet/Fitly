const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const devicesController = require('./devices.controller');
const {
	validateRegisterDeviceRequest,
	validateDeviceId,
} = require('./devices.validators');

const router = express.Router();

router.post(
	'/',
	authMiddleware,
	validateRegisterDeviceRequest,
	devicesController.registerDevice,
);
router.delete(
	'/:deviceId',
	authMiddleware,
	validateDeviceId,
	devicesController.unregisterDevice,
);

module.exports = router;
