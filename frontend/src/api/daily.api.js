import httpClient from './httpClient';

export const getTodayDaily = async () => {
	const response = await httpClient.get('/daily/today');
	return response.data.data;
};

export const updateTodayDaily = async dailyData => {
	const response = await httpClient.put('/daily/today', dailyData);
	return response.data.data;
};
