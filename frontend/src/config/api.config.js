import Constants from 'expo-constants';

const getBaseUrl = () => {
	const debuggerHost = Constants.expoConfig?.hostUri;

	if (!debuggerHost) {
		return 'http://localhost:3000/api/v1';
	}

	const ip = debuggerHost.split(':')[0];

	return `http://${ip}:3000/api/v1`;
};

export const API_BASE_URL = getBaseUrl();
