import httpClient from './httpClient';

export const getFavorites = async () => {
	const response = await httpClient.get('/favorites');
	return response.data.data;
};

export const updateFavorites = async favorites => {
	const response = await httpClient.put('/favorites', favorites);
	return response.data.data;
};
