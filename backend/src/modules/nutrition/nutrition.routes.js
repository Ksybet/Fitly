const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const nutritionController = require('./nutrition.controller');
const {
	validateProductSearchQuery,
	validateCreateProductRequest,
} = require('./nutrition.validators');

const router = express.Router();

router.get(
	'/products',
	authMiddleware,
	validateProductSearchQuery,
	nutritionController.searchProducts,
);
router.post(
	'/products',
	authMiddleware,
	validateCreateProductRequest,
	nutritionController.createCustomProduct,
);

module.exports = router;
