jest.mock('../../src/modules/favorites/favorites.repository', () => ({
	getFavorites: jest.fn(),
	updateFavorites: jest.fn(),
}));

const favoritesRepository = require('../../src/modules/favorites/favorites.repository');
const favoritesService = require('../../src/modules/favorites/favorites.service');

describe('favorites service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('gets favorites with a normalized user id', async () => {
		const favorites = { water: true, weight: false, height: true, bmi: false };
		favoritesRepository.getFavorites.mockResolvedValueOnce(favorites);

		await expect(favoritesService.getFavorites('7')).resolves.toBe(favorites);
		expect(favoritesRepository.getFavorites).toHaveBeenCalledWith(7);
	});

	test.each([null, 'invalid', 42, []])('rejects an invalid favorites body %p', async body => {
		await expect(favoritesService.updateFavorites(1, body)).rejects.toMatchObject({
			status: 400,
			message: 'Favorites data is required',
		});
		expect(favoritesRepository.updateFavorites).not.toHaveBeenCalled();
	});

	test.each([
		['water', 'false'],
		['weight', 1],
		['height', []],
		['bmi', {}],
		['water', null],
	])('rejects a non-boolean %s value', async (field, value) => {
		await expect(favoritesService.updateFavorites(1, { [field]: value })).rejects.toMatchObject({
			status: 400,
			message: `${field} must be a boolean`,
		});
		expect(favoritesRepository.updateFavorites).not.toHaveBeenCalled();
	});

	test('preserves booleans and defaults omitted fields to true', async () => {
		const updatedFavorites = { water: false, weight: true, height: true, bmi: true };
		favoritesRepository.updateFavorites.mockResolvedValueOnce(updatedFavorites);

		await expect(favoritesService.updateFavorites('7', { water: false }))
			.resolves.toBe(updatedFavorites);
		expect(favoritesRepository.updateFavorites).toHaveBeenCalledWith(7, {
			water: false,
			weight: true,
			height: true,
			bmi: true,
		});
	});
});
