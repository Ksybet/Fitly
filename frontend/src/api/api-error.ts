import { isAxiosError } from 'axios';
import type { ErrorEnvelope, FieldError } from './contracts';

type ApiClientErrorOptions = {
	status?: number;
	code?: string;
	requestId?: string;
	details?: FieldError[];
	cause?: unknown;
};

export class ApiClientError extends Error {
	readonly status?: number;
	readonly code: string;
	readonly requestId?: string;
	readonly details?: FieldError[];

	constructor(message: string, options: ApiClientErrorOptions = {}) {
		super(message, { cause: options.cause });
		this.name = 'ApiClientError';
		this.status = options.status;
		this.code = options.code ?? 'CLIENT_ERROR';
		this.requestId = options.requestId;
		this.details = options.details;
	}
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
	if (!value || typeof value !== 'object') return false;

	const envelope = value as Partial<ErrorEnvelope>;
	return (
		envelope.success === false &&
		typeof envelope.message === 'string' &&
		typeof envelope.error?.code === 'string' &&
		typeof envelope.error?.requestId === 'string'
	);
}

export function normalizeApiError(error: unknown): ApiClientError {
	if (error instanceof ApiClientError) return error;

	if (isAxiosError(error)) {
		const body: unknown = error.response?.data;

		if (isErrorEnvelope(body)) {
			return new ApiClientError(body.message, {
				status: error.response?.status,
				code: body.error.code,
				requestId: body.error.requestId,
				details: body.error.details,
				cause: error,
			});
		}

		if (!error.response) {
			return new ApiClientError('Не удалось подключиться к серверу', {
				code: 'NETWORK_ERROR',
				cause: error,
			});
		}

		return new ApiClientError('Сервер вернул некорректный ответ', {
			status: error.response.status,
			code: 'INVALID_ERROR_RESPONSE',
			cause: error,
		});
	}

	if (error instanceof Error) {
		return new ApiClientError(error.message, {
			code: 'CLIENT_ERROR',
			cause: error,
		});
	}

	return new ApiClientError('Произошла неизвестная ошибка', {
		code: 'CLIENT_ERROR',
		cause: error,
	});
}

export function withRequestId(message: string, requestId?: string): string {
	return requestId ? `${message}\n\nКод обращения: ${requestId}` : message;
}

export function getApiErrorMessage(
	error: unknown,
	fallback: string,
	translations: Partial<Record<string, string>> = {},
): string {
	const apiError = normalizeApiError(error);
	const message = translations[apiError.code] ?? apiError.message ?? fallback;

	return withRequestId(message || fallback, apiError.requestId);
}
