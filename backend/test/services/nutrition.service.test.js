jest.mock('../../src/modules/nutrition/nutrition.repository', () => ({
	searchProducts: jest.fn(),
	createCustomProduct: jest.fn(),
	getAvailableProductsByIds: jest.fn(),
	createMeal: jest.fn(),
	listMeals: jest.fn(),
	getMealById: jest.fn(),
	updateMeal: jest.fn(),
	deleteMeal: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserTimezone: jest.fn().mockResolvedValue('Europe/Moscow'),
}));

const nutritionRepository =
	require('../../src/modules/nutrition/nutrition.repository');
const nutritionService = require('../../src/modules/nutrition/nutrition.service');

function productRow(overrides = {}) {
	return {
		id: 1,
		name: 'Apple',
		calories: '52',
		proteinG: '0.3',
		fatG: '0.2',
		carbsG: '14',
		isActive: true,
		source: 'system',
		createdAt: new Date('2026-07-30T10:00:00.000Z'),
		updatedAt: new Date('2026-07-30T10:00:00.000Z'),
		...overrides,
	};
}

function mealRecord(overrides = {}) {
	return {
		entry: {
			id: 4,
			mealType: 'breakfast',
			eatenAt: new Date('2026-07-29T21:30:00.000Z'),
			date: '2026-07-30',
			title: 'Breakfast',
			createdAt: new Date('2026-07-30T08:00:00.000Z'),
			updatedAt: new Date('2026-07-30T08:00:00.000Z'),
			...overrides.entry,
		},
		items: overrides.items || [{
			id: 10,
			mealEntryId: 4,
			productId: 1,
			name: 'Apple',
			amountG: '150',
			per100gCalories: '52',
			per100gProteinG: '0.3',
			per100gFatG: '0.2',
			per100gCarbsG: '14',
			totalCalories: '78',
			totalProteinG: '0.45',
			totalFatG: '0.3',
			totalCarbsG: '21',
		}],
	};
}

describe('nutrition product service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('maps products and returns pagination metadata', async () => {
		nutritionRepository.searchProducts.mockResolvedValueOnce({
			items: [productRow()],
			total: 21,
		});

		await expect(nutritionService.searchProducts('7', {
			query: 'app',
			scope: 'all',
			page: 2,
			pageSize: 20,
		})).resolves.toEqual({
			items: [{
				id: 1,
				name: 'Apple',
				nutritionPer100g: {
					calories: 52,
					proteinG: 0.3,
					fatG: 0.2,
					carbsG: 14,
				},
				isActive: true,
				source: 'system',
				createdAt: '2026-07-30T10:00:00.000Z',
				updatedAt: '2026-07-30T10:00:00.000Z',
			}],
			meta: {
				page: 2,
				pageSize: 20,
				total: 21,
				totalPages: 2,
			},
		});
		expect(nutritionRepository.searchProducts).toHaveBeenCalledWith(7, {
			query: 'app',
			scope: 'all',
			page: 2,
			pageSize: 20,
		});
	});

	test('creates a custom product and maps database numerics', async () => {
		const input = {
			name: 'My oatmeal',
			nutritionPer100g: {
				calories: 370,
				proteinG: 13,
				fatG: 7,
				carbsG: 62,
			},
			isActive: true,
		};
		nutritionRepository.createCustomProduct.mockResolvedValueOnce(productRow({
			id: 8,
			name: input.name,
			calories: '370',
			proteinG: '13',
			fatG: '7',
			carbsG: '62',
			source: 'custom',
		}));

		await expect(nutritionService.createCustomProduct(7, input))
			.resolves.toMatchObject({
				id: 8,
				name: 'My oatmeal',
				source: 'custom',
				nutritionPer100g: input.nutritionPer100g,
			});
		expect(nutritionRepository.createCustomProduct)
			.toHaveBeenCalledWith(7, input);
	});

	test('rejects an invalid user before accessing products', async () => {
		await expect(nutritionService.searchProducts(0, {
			scope: 'all',
			page: 1,
			pageSize: 20,
		})).rejects.toMatchObject({ status: 400 });
		expect(nutritionRepository.searchProducts).not.toHaveBeenCalled();
	});
});

describe('nutrition meal service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('resolves catalog and manual items and calculates rounded totals', async () => {
		nutritionRepository.getAvailableProductsByIds.mockResolvedValueOnce([
			productRow(),
		]);
		nutritionRepository.createMeal.mockResolvedValueOnce(mealRecord({
			items: [
				mealRecord().items[0],
				{
					id: 11,
					mealEntryId: 4,
					productId: null,
					name: 'Yogurt',
					amountG: '80',
					per100gCalories: '100',
					per100gProteinG: '5',
					per100gFatG: '2',
					per100gCarbsG: '10',
					totalCalories: '80',
					totalProteinG: '4',
					totalFatG: '1.6',
					totalCarbsG: '8',
				},
			],
		}));
		const input = {
			mealType: 'breakfast',
			eatenAt: '2026-07-29T21:30:00Z',
			title: 'Breakfast',
			items: [
				{ productId: 1, amountG: 150 },
				{
					name: 'Yogurt',
					amountG: 80,
					nutritionPer100g: {
						calories: 100,
						proteinG: 5,
						fatG: 2,
						carbsG: 10,
					},
				},
			],
		};

		await expect(nutritionService.createMeal(7, input))
			.resolves.toMatchObject({
				id: 4,
				date: '2026-07-30',
				items: [
					{
						productId: 1,
						nutritionTotal: {
							calories: 78,
							proteinG: 0.45,
							fatG: 0.3,
							carbsG: 21,
						},
					},
					{
						productId: null,
						nutritionTotal: {
							calories: 80,
							proteinG: 4,
							fatG: 1.6,
							carbsG: 8,
						},
					},
				],
				nutritionTotal: {
					calories: 158,
					proteinG: 4.45,
					fatG: 1.9,
					carbsG: 29,
				},
			});

		expect(nutritionRepository.createMeal).toHaveBeenCalledWith(
			7,
			expect.objectContaining({
				items: [
					expect.objectContaining({
						productId: 1,
						name: 'Apple',
						nutritionTotal: {
							calories: 78,
							proteinG: 0.45,
							fatG: 0.3,
							carbsG: 21,
						},
					}),
					expect.objectContaining({
						productId: null,
						name: 'Yogurt',
						nutritionTotal: {
							calories: 80,
							proteinG: 4,
							fatG: 1.6,
							carbsG: 8,
						},
					}),
				],
			}),
			'Europe/Moscow',
		);
	});

	test('rejects an unavailable product with item-level details', async () => {
		nutritionRepository.getAvailableProductsByIds.mockResolvedValueOnce([]);

		await expect(nutritionService.createMeal(7, {
			mealType: 'lunch',
			eatenAt: '2026-07-30T12:00:00Z',
			title: null,
			items: [{ productId: 99, amountG: 100 }],
		})).rejects.toMatchObject({
			status: 400,
			details: [{
				field: 'items[0].productId',
				code: 'UNAVAILABLE_PRODUCT',
			}],
		});
		expect(nutritionRepository.createMeal).not.toHaveBeenCalled();
	});

	test('lists meals with pagination in the user timezone', async () => {
		nutritionRepository.listMeals.mockResolvedValueOnce({
			records: [mealRecord()],
			total: 1,
		});

		await expect(nutritionService.listMeals(7, {
			from: '2026-07-30',
			to: '2026-07-30',
			mealType: 'breakfast',
			page: 1,
			pageSize: 20,
		})).resolves.toMatchObject({
			items: [expect.objectContaining({ id: 4, date: '2026-07-30' })],
			meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
		});
		expect(nutritionRepository.listMeals)
			.toHaveBeenCalledWith(
				7,
				expect.objectContaining({ from: '2026-07-30' }),
				'Europe/Moscow',
			);
	});

	test('returns a safe 404 for a missing or foreign meal', async () => {
		nutritionRepository.getMealById.mockResolvedValueOnce(null);
		nutritionRepository.deleteMeal.mockResolvedValueOnce(false);

		await expect(nutritionService.getMeal(7, 44))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
		await expect(nutritionService.deleteMeal(7, 44))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	test('fully replaces meal contents and clears an omitted title', async () => {
		nutritionRepository.getAvailableProductsByIds.mockResolvedValueOnce([
			productRow(),
		]);
		nutritionRepository.updateMeal.mockResolvedValueOnce(mealRecord({
			entry: { mealType: 'lunch', title: null },
		}));

		await nutritionService.updateMeal(7, 4, {
			mealType: 'lunch',
			eatenAt: '2026-07-30T10:00:00Z',
			title: null,
			items: [{ productId: 1, amountG: 150 }],
		});

		expect(nutritionRepository.updateMeal).toHaveBeenCalledWith(
			7,
			4,
			expect.objectContaining({
				mealType: 'lunch',
				title: null,
				items: [expect.objectContaining({ productId: 1 })],
			}),
			'Europe/Moscow',
		);
	});
});
