import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api.config';

const httpClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});

httpClient.interceptors.request.use(async config => {
	const token = await AsyncStorage.getItem('accessToken');

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

export default httpClient;
