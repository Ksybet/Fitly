import httpClient from './httpClient';
import { unwrapData } from './response';
import type { SuccessEnvelope, WaterDay } from './contracts';

export async function getTodayWater(): Promise<WaterDay> {
	const response =
		await httpClient.get<SuccessEnvelope<WaterDay>>('/water/today');

	return unwrapData(response);
}

export async function setTodayWater(amountMl: number): Promise<WaterDay> {
	const response = await httpClient.put<SuccessEnvelope<WaterDay>>(
		'/water/today',
		{ amountMl },
	);

	return unwrapData(response);
}
