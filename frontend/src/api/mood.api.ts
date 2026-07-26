import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	MoodEntry,
	MoodTodayRequest,
	SuccessEnvelope,
} from './contracts';

export async function getTodayMood(): Promise<MoodEntry | null> {
	const response = await httpClient.get<
		SuccessEnvelope<MoodEntry | null>
	>('/mood/today');

	return unwrapData(response);
}

export async function updateTodayMood(
	moodData: MoodTodayRequest,
): Promise<MoodEntry> {
	const response = await httpClient.put<SuccessEnvelope<MoodEntry>>(
		'/mood/today',
		moodData,
	);

	return unwrapData(response);
}
