const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const favoritesController = require('./favorites.controller');
const {
	validateUpdateFavoritesRequest,
} = require('./favorites.validators');

const router = express.Router();

router.get('/', authMiddleware, favoritesController.getFavorites);
router.put(
	'/',
	authMiddleware,
	validateUpdateFavoritesRequest,
	favoritesController.updateFavorites,
);

module.exports = router;
