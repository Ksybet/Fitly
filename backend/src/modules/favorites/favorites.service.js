const favoritesRepository = require('./favorites.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

async function getFavorites(userId) {
	return favoritesRepository.getFavorites(ensureValidUserId(userId));
}

async function updateFavorites(userId, favorites) {
	if (!favorites || typeof favorites !== 'object' || Array.isArray(favorites)) {
		throw new ApiError(400, 'Favorites data is required');
	}

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
