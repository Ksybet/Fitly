const favoritesService = require('./favorites.service');
const { sendSuccess } = require('../../utils/http-response');

async function getFavorites(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const favorites = await favoritesService.getFavorites(userId);

		return sendSuccess(res, favorites);
	} catch (error) {
		next(error);
	}
}

async function updateFavorites(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const favorites = await favoritesService.updateFavorites(userId, req.body);

		return sendSuccess(res, favorites);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getFavorites,
	updateFavorites,
};
