import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	DailyTracking,
	DailyTrackingRequest,
	SuccessEnvelope,
} from './contracts';

export async function getTodayDaily(): Promise<DailyTracking> {
	const response = await httpClient.get<SuccessEnvelope<DailyTracking>>(
		'/daily/today',
	);

	return unwrapData(response);
}

export async function updateTodayDaily(
	dailyData: DailyTrackingRequest,
): Promise<DailyTracking> {
	const response = await httpClient.put<SuccessEnvelope<DailyTracking>>(
		'/daily/today',
		dailyData,
	);

	return unwrapData(response);
}
