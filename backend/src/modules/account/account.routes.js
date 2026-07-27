const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const { deleteMyAccount } = require('./account.controller');
const {
	validateDeleteAccountRequest,
} = require('./account.validators');

const router = express.Router();

router.delete(
	'/',
	authMiddleware,
	validateDeleteAccountRequest,
	deleteMyAccount,
);

module.exports = router;
