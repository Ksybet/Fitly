import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';
import { normalizeApiError } from './api-error';
import { clearStoredSession, getStoredSession } from './session.storage';

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedHandlingPromise: Promise<void> | null = null;

const httpClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});

export function setUnauthorizedHandler(
	handler: UnauthorizedHandler | null,
): void {
	unauthorizedHandler = handler;
}

function skipsGlobalUnauthorizedHandling(url?: string): boolean {
	if (!url) return false;

	return (
		url.endsWith('/auth/login') ||
		url.endsWith('/auth/register') ||
		url.endsWith('/account')
	);
}

async function handleUnauthorized(): Promise<void> {
	if (unauthorizedHandlingPromise) return unauthorizedHandlingPromise;

	unauthorizedHandlingPromise = (async () => {
		if (unauthorizedHandler) {
			await unauthorizedHandler();
		} else {
			await clearStoredSession();
		}
	})().finally(() => {
		unauthorizedHandlingPromise = null;
	});

	return unauthorizedHandlingPromise;
}

httpClient.interceptors.request.use(async config => {
	const session = await getStoredSession();

	if (session?.token) {
		config.headers.Authorization = `${session.tokenType} ${session.token}`;
	}

	return config;
});

httpClient.interceptors.response.use(
	response => response,
	async error => {
		if (
			error?.response?.status === 401 &&
			!skipsGlobalUnauthorizedHandling(error?.config?.url)
		) {
			await handleUnauthorized();
		}

		return Promise.reject(normalizeApiError(error));
	},
);

export default httpClient;
