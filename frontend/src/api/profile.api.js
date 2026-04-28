import httpClient from './httpClient';

export const getMyProfile = async () => {
	const response = await httpClient.get('/profile');
	return response.data.data;
};

export const updateMyProfile = async profileData => {
	const response = await httpClient.put('/profile', profileData);
	return response.data.data;
};

export const deleteMyAccount = async (password) => {
	const response = await httpClient.delete('/profile', {
		data: { password },
	});

	return response.data;
};
