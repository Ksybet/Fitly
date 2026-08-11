import type { AxiosResponse } from 'axios';
import httpClient from './httpClient';
import { unwrapData } from './response';
import type {
	AddWaterResult,
	DeletedResult,
	HealthDateRange,
	HealthHistoryFilters,
	PaginatedEnvelope,
	PaginationMeta,
	SleepEntry,
	SleepEntryRequest,
	StepEntry,
	SuccessEnvelope,
	WaterEntry,
	WaterEntryRequest,
	WeightEntry,
	WeightEntryRequest,
} from './contracts';

export type HealthPage<T> = {
	items: T[];
	meta: PaginationMeta;
};

function definedParams(filters: object) {
	return Object.fromEntries(
		Object.entries(filters).filter(([, value]) => value !== undefined),
	);
}

function unwrapPage<T>(
	response: AxiosResponse<PaginatedEnvelope<T>>,
): HealthPage<T> {
	return {
		items: unwrapData(response),
		meta: response.data.meta,
	};
}

export async function listWeightEntries(
	filters: HealthHistoryFilters = {},
): Promise<HealthPage<WeightEntry>> {
	const response = await httpClient.get<PaginatedEnvelope<WeightEntry>>(
		'/health/weight',
		{ params: definedParams(filters) },
	);
	return unwrapPage(response);
}

export async function createWeightEntry(
	entry: WeightEntryRequest,
): Promise<WeightEntry> {
	const response = await httpClient.post<SuccessEnvelope<WeightEntry>>(
		'/health/weight',
		entry,
	);
	return unwrapData(response);
}

export async function getWeightEntry(entryId: number): Promise<WeightEntry> {
	const response = await httpClient.get<SuccessEnvelope<WeightEntry>>(
		`/health/weight/${entryId}`,
	);
	return unwrapData(response);
}

export async function updateWeightEntry(
	entryId: number,
	entry: WeightEntryRequest,
): Promise<WeightEntry> {
	const response = await httpClient.patch<SuccessEnvelope<WeightEntry>>(
		`/health/weight/${entryId}`,
		entry,
	);
	return unwrapData(response);
}

export async function deleteWeightEntry(
	entryId: number,
): Promise<DeletedResult> {
	const response = await httpClient.delete<SuccessEnvelope<DeletedResult>>(
		`/health/weight/${entryId}`,
	);
	return unwrapData(response);
}

export async function listSleepEntries(
	filters: HealthHistoryFilters = {},
): Promise<HealthPage<SleepEntry>> {
	const response = await httpClient.get<PaginatedEnvelope<SleepEntry>>(
		'/health/sleep',
		{ params: definedParams(filters) },
	);
	return unwrapPage(response);
}

export async function createSleepEntry(
	entry: SleepEntryRequest,
): Promise<SleepEntry> {
	const response = await httpClient.post<SuccessEnvelope<SleepEntry>>(
		'/health/sleep',
		entry,
	);
	return unwrapData(response);
}

export async function updateSleepEntry(
	entryId: number,
	entry: SleepEntryRequest,
): Promise<SleepEntry> {
	const response = await httpClient.patch<SuccessEnvelope<SleepEntry>>(
		`/health/sleep/${entryId}`,
		entry,
	);
	return unwrapData(response);
}

export async function deleteSleepEntry(
	entryId: number,
): Promise<DeletedResult> {
	const response = await httpClient.delete<SuccessEnvelope<DeletedResult>>(
		`/health/sleep/${entryId}`,
	);
	return unwrapData(response);
}

export async function listWaterEntries(
	filters: HealthHistoryFilters = {},
): Promise<HealthPage<WaterEntry>> {
	const response = await httpClient.get<PaginatedEnvelope<WaterEntry>>(
		'/health/water',
		{ params: definedParams(filters) },
	);
	return unwrapPage(response);
}

export async function addWater(entry: WaterEntryRequest): Promise<AddWaterResult> {
	const response = await httpClient.post<SuccessEnvelope<AddWaterResult>>(
		'/health/water',
		entry,
	);
	return unwrapData(response);
}

export async function updateWaterEntry(
	entryId: number,
	entry: WaterEntryRequest,
): Promise<WaterEntry> {
	const response = await httpClient.patch<SuccessEnvelope<WaterEntry>>(
		`/health/water/${entryId}`,
		entry,
	);
	return unwrapData(response);
}

export async function deleteWaterEntry(
	entryId: number,
): Promise<DeletedResult> {
	const response = await httpClient.delete<SuccessEnvelope<DeletedResult>>(
		`/health/water/${entryId}`,
	);
	return unwrapData(response);
}

export async function listStepEntries(
	filters: HealthDateRange = {},
): Promise<StepEntry[]> {
	const response = await httpClient.get<SuccessEnvelope<StepEntry[]>>(
		'/health/steps',
		{ params: definedParams(filters) },
	);
	return unwrapData(response);
}

export async function upsertStepsForDate(
	date: string,
	steps: number,
): Promise<StepEntry> {
	const response = await httpClient.put<SuccessEnvelope<StepEntry>>(
		`/health/steps/${date}`,
		{ steps },
	);
	return unwrapData(response);
}
