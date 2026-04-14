const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const { getMyProfile, updateMyProfile } = require('./profile.controller');
const {
	validateGetProfileRequest,
	validateUpdateProfileRequest,
} = require('./profile.validators');

const router = express.Router();

router.get('/', authMiddleware, validateGetProfileRequest, getMyProfile);
router.put('/', authMiddleware, validateUpdateProfileRequest, updateMyProfile);

module.exports = router;
