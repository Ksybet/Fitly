import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const httpClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});

export default httpClient;
