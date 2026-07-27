import type { AxiosResponse } from 'axios';
import { ApiClientError } from './api-error';
import type { SuccessEnvelope } from './contracts';

export function unwrapData<T>(
	response: AxiosResponse<SuccessEnvelope<T>>,
): T {
	const envelope = response.data;

	if (
		!envelope ||
		envelope.success !== true ||
		!Object.prototype.hasOwnProperty.call(envelope, 'data')
	) {
		throw new ApiClientError('Сервер вернул некорректный ответ', {
			code: 'INVALID_SUCCESS_RESPONSE',
			requestId: envelope?.meta?.requestId,
		});
	}

	return envelope.data;
}
