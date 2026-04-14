const express = require('express');
const { login, me, register } = require('./auth.controller');
const {
	validateLoginRequest,
	validateRegisterRequest,
} = require('./auth.validators');
const { authMiddleware } = require('./auth.middleware');

const router = express.Router();

router.post('/login', validateLoginRequest, login);
router.post('/register', validateRegisterRequest, register);
router.get('/me', authMiddleware, me);

module.exports = router;
