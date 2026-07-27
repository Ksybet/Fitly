const express = require('express');
const {
	login,
	logout,
	logoutAll,
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
router.post(
	'/logout',
	authMiddleware,
	validateRefreshTokenRequest,
	logout,
);
router.post('/logout-all', authMiddleware, logoutAll);
router.get('/me', authMiddleware, me);

module.exports = router;
