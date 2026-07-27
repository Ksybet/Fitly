const favoritesRepository = require('./favorites.repository');
const { ensureValidUserId } = require('../../utils/validation');

async function getFavorites(userId) {
	return favoritesRepository.getFavorites(ensureValidUserId(userId));
}

async function updateFavorites(userId, favorites) {
	return favoritesRepository.updateFavorites(ensureValidUserId(userId), {
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
