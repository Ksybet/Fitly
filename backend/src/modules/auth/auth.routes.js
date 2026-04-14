const express = require('express');
const { login, me } = require('./auth.controller');
const { validateLoginRequest } = require('./auth.validators');
const { authMiddleware } = require('./auth.middleware')

const router = express.Router();

router.post('/login', validateLoginRequest, login);
router.get('/me', authMiddleware, me);

module.exports = router;
