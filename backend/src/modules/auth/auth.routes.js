const express = require('express');
const {
	login,
	me,
	refresh,
	register,
} = require('./auth.controller');
const {
	validateLoginRequest,
	validateRefreshTokenRequest,
	validateRegisterRequest,
} = require('./auth.validators');
const { authMiddleware } = require('./auth.middleware');

const router = express.Router();

router.post('/login', validateLoginRequest, login);
router.post('/register', validateRegisterRequest, register);
router.post('/refresh', validateRefreshTokenRequest, refresh);
router.get('/me', authMiddleware, me);

module.exports = router;
