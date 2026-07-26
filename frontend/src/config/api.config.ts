const DEFAULT_API_BASE_URL = 'https://api.fitlyapp.ru/api/v1';

function normalizeBaseUrl(value: string): string {
	return value.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeBaseUrl(
	process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
);
