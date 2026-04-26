const favoritesService = require('./favorites.service');

async function getFavorites(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const favorites = await favoritesService.getFavorites(userId);

		return res.json({
			success: true,
			data: favorites,
		});
	} catch (error) {
		next(error);
	}
}

async function updateFavorites(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const favorites = await favoritesService.updateFavorites(userId, req.body);

		return res.json({
			success: true,
			data: favorites,
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getFavorites,
	updateFavorites,
};
