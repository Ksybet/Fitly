import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_BASE_URL } from '../config/api.config';

const httpClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});

httpClient.interceptors.request.use(async config => {
	const token = await AsyncStorage.getItem('userToken');

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

httpClient.interceptors.response.use(
	response => response,
	async error => {
		if (error?.response?.status === 401) {
			console.log('TOKEN EXPIRED');

			await AsyncStorage.removeItem('userToken');
			await AsyncStorage.removeItem('profile');

			delete httpClient.defaults.headers.common.Authorization;

			router.replace('/login');
		}

		return Promise.reject(error);
	},
);

export default httpClient;
