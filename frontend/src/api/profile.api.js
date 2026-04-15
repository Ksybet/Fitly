import httpClient from './httpClient';

export const getMyProfile = async token => {
	const response = await httpClient.get('/profile', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	return response.data.data;
};

export const updateMyProfile = async (token, profileData) => {
	const response = await httpClient.put('/profile', profileData, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	return response.data.data;
};
