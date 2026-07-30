import { normalizeApiError } from './api-error';
import type {
	BodyArea,
	Intensity,
	PaginatedEnvelope,
	PaginationMeta,
	SuccessEnvelope,
	Workout,
	WorkoutSummary,
	WorkoutType,
} from './contracts';
import httpClient from './httpClient';
import { unwrapData } from './response';

export type WorkoutCatalogFilters = {
	type?: WorkoutType;
	bodyArea?: BodyArea;
	intensity?: Intensity;
	maxDurationMinutes?: number;
	page?: number;
	pageSize?: number;
};

export type WorkoutCatalogPage = {
	items: WorkoutSummary[];
	meta: PaginationMeta;
};

function definedParams(filters: WorkoutCatalogFilters) {
	return Object.fromEntries(
		Object.entries(filters).filter(([, value]) => value !== undefined),
	);
}

export async function getWorkoutCatalog(
	filters: WorkoutCatalogFilters = {},
): Promise<WorkoutCatalogPage> {
	try {
		const response = await httpClient.get<PaginatedEnvelope<WorkoutSummary>>(
			'/workouts/catalog',
			{ params: definedParams(filters) },
		);

		return {
			items: unwrapData(response),
			meta: response.data.meta,
		};
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function getWorkoutById(workoutId: number): Promise<Workout> {
	try {
		const response = await httpClient.get<SuccessEnvelope<Workout>>(
			`/workouts/catalog/${workoutId}`,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}
