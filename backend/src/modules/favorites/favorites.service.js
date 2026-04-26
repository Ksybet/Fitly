const favoritesRepository = require('./favorites.repository');

async function getFavorites(userId) {
	return favoritesRepository.getFavorites(userId);
}

async function updateFavorites(userId, favorites) {
	return favoritesRepository.updateFavorites(userId, {
		water: favorites.water ?? true,
		weight: favorites.weight ?? true,
		height: favorites.height ?? true,
		bmi: favorites.bmi ?? true,
	});
}

module.exports = {
	getFavorites,
	updateFavorites,
};
