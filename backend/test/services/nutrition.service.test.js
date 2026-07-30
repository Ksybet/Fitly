jest.mock('../../src/modules/nutrition/nutrition.repository', () => ({
	searchProducts: jest.fn(),
	createCustomProduct: jest.fn(),
	getAvailableProductsByIds: jest.fn(),
	createMeal: jest.fn(),
	listMeals: jest.fn(),
	getMealById: jest.fn(),
	getMealsForDate: jest.fn(),
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
							calories: '78',
							proteinG: '0.45',
							fatG: '0.3',
							carbsG: '21',
						},
					}),
					expect.objectContaining({
						productId: null,
						name: 'Yogurt',
						nutritionTotal: {
							calories: '80',
							proteinG: '4',
							fatG: '1.6',
							carbsG: '8',
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
		nutritionRepository.getMealById.mockResolvedValueOnce(mealRecord());
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
		expect(nutritionRepository.getAvailableProductsByIds)
			.not.toHaveBeenCalled();
	});

	test('merges duplicate catalog products in first-occurrence order', async () => {
		nutritionRepository.getAvailableProductsByIds.mockResolvedValueOnce([
			productRow(),
			productRow({ id: 2, name: 'Banana' }),
		]);
		nutritionRepository.createMeal.mockResolvedValueOnce(mealRecord());

		await nutritionService.createMeal(7, {
			mealType: 'breakfast',
			eatenAt: '2026-07-30T08:00:00Z',
			title: null,
			items: [
				{ productId: 1, amountG: 100.1 },
				{ productId: 2, amountG: 50 },
				{ productId: 1, amountG: 49.9 },
			],
		});

		const savedItems = nutritionRepository.createMeal.mock.calls[0][1].items;
		expect(savedItems).toHaveLength(2);
		expect(savedItems.map(item => item.productId)).toEqual([1, 2]);
		expect(savedItems[0]).toMatchObject({
			amountG: 150,
			nutritionTotal: { calories: '78' },
		});
	});

	test('rejects duplicate products whose combined amount exceeds the limit', async () => {
		await expect(nutritionService.createMeal(7, {
			mealType: 'breakfast',
			eatenAt: '2026-07-30T08:00:00Z',
			title: null,
			items: [
				{ productId: 1, amountG: 6000 },
				{ productId: 1, amountG: 4000.1 },
			],
		})).rejects.toMatchObject({
			status: 400,
			details: [{
				field: 'items[1].amountG',
				code: 'OUT_OF_RANGE',
			}],
		});
		expect(nutritionRepository.getAvailableProductsByIds)
			.not.toHaveBeenCalled();
	});

	test('keeps the stored catalog snapshot when only amount changes', async () => {
		nutritionRepository.getMealById.mockResolvedValueOnce(mealRecord());
		nutritionRepository.updateMeal.mockResolvedValueOnce(mealRecord());

		await nutritionService.updateMeal(7, 4, {
			mealType: 'breakfast',
			eatenAt: '2026-07-29T21:30:00Z',
			title: 'Breakfast',
			items: [{ productId: 1, amountG: 200 }],
		});

		const savedItem = nutritionRepository.updateMeal.mock.calls[0][2].items[0];
		expect(savedItem).toMatchObject({
			productId: 1,
			name: 'Apple',
			amountG: 200,
			nutritionPer100g: {
				calories: '52',
				proteinG: '0.3',
				fatG: '0.2',
				carbsG: '14',
			},
			nutritionTotal: {
				calories: '104',
				proteinG: '0.6',
				fatG: '0.4',
				carbsG: '28',
			},
		});
		expect(nutritionRepository.getAvailableProductsByIds)
			.not.toHaveBeenCalled();
	});

	test('loads a fresh snapshot when a catalog product is replaced', async () => {
		nutritionRepository.getMealById.mockResolvedValueOnce(mealRecord());
		nutritionRepository.getAvailableProductsByIds.mockResolvedValueOnce([
			productRow({
				id: 2,
				name: 'Banana',
				calories: '89',
				proteinG: '1.1',
				fatG: '0.3',
				carbsG: '23',
			}),
		]);
		nutritionRepository.updateMeal.mockResolvedValueOnce(mealRecord());

		await nutritionService.updateMeal(7, 4, {
			mealType: 'breakfast',
			eatenAt: '2026-07-29T21:30:00Z',
			title: null,
			items: [{ productId: 2, amountG: 100 }],
		});

		expect(nutritionRepository.getAvailableProductsByIds)
			.toHaveBeenCalledWith(7, [2]);
		expect(nutritionRepository.updateMeal.mock.calls[0][2].items[0])
			.toMatchObject({
				productId: 2,
				name: 'Banana',
				nutritionTotal: {
					calories: '89',
					proteinG: '1.1',
					fatG: '0.3',
					carbsG: '23',
				},
			});
	});

	test('checks ownership before resolving replacement products', async () => {
		nutritionRepository.getMealById.mockResolvedValueOnce(null);

		await expect(nutritionService.updateMeal(7, 99, {
			mealType: 'dinner',
			eatenAt: '2026-07-30T18:00:00Z',
			title: null,
			items: [{ productId: 99, amountG: 100 }],
		})).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
		expect(nutritionRepository.getAvailableProductsByIds)
			.not.toHaveBeenCalled();
		expect(nutritionRepository.updateMeal).not.toHaveBeenCalled();
	});

	test('returns zero and exact accumulated daily nutrition', async () => {
		nutritionRepository.getMealsForDate.mockResolvedValueOnce([]);

		await expect(nutritionService.getNutritionDay(7, '2026-07-30'))
			.resolves.toEqual({
				date: '2026-07-30',
				meals: [],
				totals: {
					calories: 0,
					proteinG: 0,
					fatG: 0,
					carbsG: 0,
				},
			});

		const preciseRecord = mealRecord({
			items: [
				{
					...mealRecord().items[0],
					totalCalories: '0.004',
					totalProteinG: '0.004',
					totalFatG: '0.004',
					totalCarbsG: '0.004',
				},
				{
					...mealRecord().items[0],
					id: 11,
					totalCalories: '0.004',
					totalProteinG: '0.004',
					totalFatG: '0.004',
					totalCarbsG: '0.004',
				},
			],
		});
		nutritionRepository.getMealsForDate.mockResolvedValueOnce([preciseRecord]);

		await expect(nutritionService.getNutritionDay(7, '2026-07-30'))
			.resolves.toMatchObject({
				meals: [{
					items: [
						{ nutritionTotal: { calories: 0 } },
						{ nutritionTotal: { calories: 0 } },
					],
					nutritionTotal: { calories: 0.01 },
				}],
				totals: {
					calories: 0.01,
					proteinG: 0.01,
					fatG: 0.01,
					carbsG: 0.01,
				},
			});
		expect(nutritionRepository.getMealsForDate)
			.toHaveBeenLastCalledWith(7, '2026-07-30', 'Europe/Moscow');
	});
});
