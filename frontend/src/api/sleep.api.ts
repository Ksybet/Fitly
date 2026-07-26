import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	SleepEntry,
	SleepTodayRequest,
	SuccessEnvelope,
} from './contracts';

export async function getTodaySleep(): Promise<SleepEntry | null> {
	const response = await httpClient.get<
		SuccessEnvelope<SleepEntry | null>
	>('/sleep/today');

	return unwrapData(response);
}

export async function updateTodaySleep(
	sleepData: SleepTodayRequest,
): Promise<SleepEntry> {
	const response = await httpClient.put<SuccessEnvelope<SleepEntry>>(
		'/sleep/today',
		sleepData,
	);

	return unwrapData(response);
}
