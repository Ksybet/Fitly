import httpClient from './httpClient';

export const login = async ({ login, password, appVersion }) => {
	console.log('LOGIN PAYLOAD:', { login, password, appVersion });

	const response = await httpClient.post('/auth/login', {
		login,
		password,
		appVersion,
	});

	return response.data.data;
};

export const getMe = async token => {
	const response = await httpClient.get('/auth/me', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	return response.data.data;
};
