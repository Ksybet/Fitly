import httpClient from './httpClient';

export const getTodaySleep = async () => {
	const response = await httpClient.get('/sleep/today');
	return response.data.data;
};

export const updateTodaySleep = async sleepData => {
	const response = await httpClient.put('/sleep/today', sleepData);
	return response.data.data;
};
