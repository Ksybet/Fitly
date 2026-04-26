import httpClient from './httpClient';

export const getTodayWater = async () => {
	const response = await httpClient.get('/water/today');
	return response.data.data;
};

export const addWater = async amountMl => {
	const response = await httpClient.post('/water/today', {
		amountMl,
	});
	return response.data.data;
};

export const resetTodayWater = async () => {
	const response = await httpClient.delete('/water/today');
	return response.data.data;
};
