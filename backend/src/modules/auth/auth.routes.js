const express = require('express');
const { login } = require('./auth.controller');
const { validateLoginRequest } = require('./auth.validators');

const router = express.Router();

router.post('/login', validateLoginRequest, login);

module.exports = router;
