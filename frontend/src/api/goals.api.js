import httpClient from './httpClient';

export const getGoals = async () => {
	const response = await httpClient.get('/goals');
	return response.data.data;
};

export const updateGoals = async goals => {
	const response = await httpClient.put('/goals', {
		goals,
	});
	return response.data.data;
};
