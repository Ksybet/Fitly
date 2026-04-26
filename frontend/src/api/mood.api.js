import httpClient from './httpClient';

export const getTodayMood = async () => {
	const response = await httpClient.get('/mood/today');
	return response.data.data;
};

export const updateTodayMood = async moodData => {
	const response = await httpClient.put('/mood/today', moodData);
	return response.data.data;
};
