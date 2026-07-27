import axios, {
	isAxiosError,
	type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '../config/api.config';
import { normalizeApiError } from './api-error';
import type {
	AuthTokens,
	StoredAuthSession,
	SuccessEnvelope,
} from './contracts';
import { unwrapData } from './response';
import {
	clearStoredSession,
	getStoredSession,
	saveRefreshedTokens,
} from './session.storage';

type UnauthorizedHandler = () => Promise<void> | void;
type SessionRefreshedHandler = (
	session: StoredAuthSession,
) => Promise<void> | void;
type RetryableRequestConfig = InternalAxiosRequestConfig & {
	_retry?: boolean;
};

let unauthorizedHandler: UnauthorizedHandler | null = null;
let sessionRefreshedHandler: SessionRefreshedHandler | null = null;
let unauthorizedHandlingPromise: Promise<void> | null = null;
let sessionRefreshPromise: Promise<StoredAuthSession | null> | null = null;

const httpClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000,
});
const refreshClient = axios.create({
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

export function setSessionRefreshedHandler(
	handler: SessionRefreshedHandler | null,
): void {
	sessionRefreshedHandler = handler;
}

function skipsSessionRefresh(url?: string): boolean {
	if (!url) return false;

	return (
		url.endsWith('/auth/login') ||
		url.endsWith('/auth/register') ||
		url.endsWith('/auth/refresh')
	);
}

function getApiErrorCode(error: unknown): string | undefined {
	if (!isAxiosError(error)) return undefined;

	const data = error.response?.data as {
		error?: { code?: unknown };
	} | undefined;

	return typeof data?.error?.code === 'string'
		? data.error.code
		: undefined;
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

async function refreshStoredSession(): Promise<StoredAuthSession | null> {
	if (sessionRefreshPromise) return sessionRefreshPromise;

	sessionRefreshPromise = (async () => {
		const session = await getStoredSession();

		if (!session?.refreshToken) {
			throw new Error('Refresh token is unavailable');
		}

		const expectedRefreshToken = session.refreshToken;
		const response = await refreshClient.post<SuccessEnvelope<AuthTokens>>(
			'/auth/refresh',
			{ refreshToken: expectedRefreshToken },
		);
		const tokens = unwrapData(response);
		const refreshedSession = await saveRefreshedTokens(
			tokens,
			expectedRefreshToken,
		);

		if (refreshedSession && sessionRefreshedHandler) {
			await sessionRefreshedHandler(refreshedSession);
		}

		return refreshedSession;
	})().finally(() => {
		sessionRefreshPromise = null;
	});

	return sessionRefreshPromise;
}

export async function waitForPendingSessionRefresh(): Promise<void> {
	if (!sessionRefreshPromise) return;

	try {
		await sessionRefreshPromise;
	} catch {
		// The response interceptor owns refresh-failure cleanup.
	}
}

function replaceLogoutRefreshToken(
	config: RetryableRequestConfig,
	refreshToken: string,
): void {
	if (!config.url?.endsWith('/auth/logout')) return;

	config.data = JSON.stringify({ refreshToken });
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
	async (error: unknown) => {
		if (!isAxiosError(error)) {
			return Promise.reject(normalizeApiError(error));
		}

		const config = error.config as RetryableRequestConfig | undefined;
		const shouldRefresh =
			error.response?.status === 401
			&& getApiErrorCode(error) === 'UNAUTHORIZED'
			&& !skipsSessionRefresh(config?.url);

		if (!shouldRefresh || !config) {
			return Promise.reject(normalizeApiError(error));
		}

		if (config._retry) {
			await handleUnauthorized();
			return Promise.reject(normalizeApiError(error));
		}

		config._retry = true;

		try {
			const refreshedSession = await refreshStoredSession();

			if (!refreshedSession) {
				return Promise.reject(normalizeApiError(error));
			}

			config.headers.Authorization =
				`${refreshedSession.tokenType} ${refreshedSession.token}`;
			replaceLogoutRefreshToken(
				config,
				refreshedSession.refreshToken,
			);

			return httpClient(config);
		} catch (refreshError) {
			await handleUnauthorized();
			return Promise.reject(normalizeApiError(refreshError));
		}
	},
);

export default httpClient;
