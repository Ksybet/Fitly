const express = require('express');
const { authMiddleware } = require('../auth/auth.middleware');
const favoritesController = require('./favorites.controller');

const router = express.Router();

router.get('/', authMiddleware, favoritesController.getFavorites);
router.put('/', authMiddleware, favoritesController.updateFavorites);

module.exports = router;
