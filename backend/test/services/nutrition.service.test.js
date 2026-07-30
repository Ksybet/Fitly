jest.mock('../../src/modules/nutrition/nutrition.repository', () => ({
	searchProducts: jest.fn(),
	createCustomProduct: jest.fn(),
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
