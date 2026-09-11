import { normalizeApiError } from './api-error';
import httpClient from './httpClient';
import { unwrapData } from './response';

import type {
	FoodProduct,
	FoodProductRequest,
	MealEntry,
	MealEntryRequest,
	MealType,
	NutritionDay,
	PaginatedEnvelope,
	PaginationMeta,
	SuccessEnvelope,
} from './contracts';

export type FoodProductFilters = {
	query?: string;
	scope?: 'all' | 'system' | 'custom';
	page?: number;
	pageSize?: number;
};

export type FoodProductPage = {
	items: FoodProduct[];
	meta: PaginationMeta;
};

export type MealFilters = {
	fromDate?: string;
	toDate?: string;
	mealType?: MealType;
	page?: number;
	pageSize?: number;
};

export type MealPage = {
	items: MealEntry[];
	meta: PaginationMeta;
};

function definedParams<T extends object>(params: T) {
	return Object.fromEntries(
		Object.entries(params).filter(([, value]) => value !== undefined),
	);
}

export async function searchFoodProducts(
	filters: FoodProductFilters = {},
): Promise<FoodProductPage> {
	try {
		const response = await httpClient.get<PaginatedEnvelope<FoodProduct>>(
			'/nutrition/products',
			{
				params: definedParams(filters),
			},
		);

		return {
			items: unwrapData(response),
			meta: response.data.meta,
		};
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function createCustomFoodProduct(
	data: FoodProductRequest,
): Promise<FoodProduct> {
	try {
		const response = await httpClient.post<SuccessEnvelope<FoodProduct>>(
			'/nutrition/products',
			data,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function getMeals(filters: MealFilters = {}): Promise<MealPage> {
	try {
		const response = await httpClient.get<PaginatedEnvelope<MealEntry>>(
			'/nutrition/meals',
			{
				params: definedParams(filters),
			},
		);

		return {
			items: unwrapData(response),
			meta: response.data.meta,
		};
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function createMeal(data: MealEntryRequest): Promise<MealEntry> {
	try {
		const response = await httpClient.post<SuccessEnvelope<MealEntry>>(
			'/nutrition/meals',
			data,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function getMealById(mealId: number): Promise<MealEntry> {
	try {
		const response = await httpClient.get<SuccessEnvelope<MealEntry>>(
			`/nutrition/meals/${mealId}`,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function updateMeal(
	mealId: number,
	data: MealEntryRequest,
): Promise<MealEntry> {
	try {
		const response = await httpClient.patch<SuccessEnvelope<MealEntry>>(
			`/nutrition/meals/${mealId}`,
			data,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function deleteMeal(mealId: number): Promise<{ deleted: true }> {
	try {
		const response = await httpClient.delete<
			SuccessEnvelope<{ deleted: true }>
		>(`/nutrition/meals/${mealId}`);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}

export async function getNutritionDay(date: string): Promise<NutritionDay> {
	try {
		const response = await httpClient.get<SuccessEnvelope<NutritionDay>>(
			`/nutrition/daily/${date}`,
		);

		return unwrapData(response);
	} catch (error) {
		throw normalizeApiError(error);
	}
}
