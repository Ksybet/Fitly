jest.mock('../../src/modules/admin/admin-food.repository', () => ({
	listFoodProducts: jest.fn(),
	getFoodProductById: jest.fn(),
	createFoodProduct: jest.fn(),
	updateFoodProduct: jest.fn(),
	deactivateFoodProduct: jest.fn(),
}));

const repository = require('../../src/modules/admin/admin-food.repository');
const service = require('../../src/modules/admin/admin-food.service');

function foodProductRow(overrides = {}) {
	return {
		id: 15,
		name: 'Oatmeal',
		calories: '120.5',
		proteinG: '4.5',
		fatG: '3.2',
		carbsG: '19.7',
		isActive: true,
		source: 'system',
		createdAt: new Date('2026-08-11T10:00:00.000Z'),
		updatedAt: new Date('2026-08-11T10:00:00.000Z'),
		...overrides,
	};
}

describe('admin food service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists active and inactive system products with default pagination', async () => {
		repository.listFoodProducts.mockResolvedValueOnce({
			items: [foodProductRow({ isActive: false })],
			total: 21,
		});

		await expect(service.listFoodProducts()).resolves.toEqual({
			items: [{
				id: 15,
				name: 'Oatmeal',
				nutritionPer100g: {
					calories: 120.5,
					proteinG: 4.5,
					fatG: 3.2,
					carbsG: 19.7,
				},
				isActive: false,
				source: 'system',
				createdAt: '2026-08-11T10:00:00.000Z',
				updatedAt: '2026-08-11T10:00:00.000Z',
			}],
			meta: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
		});
		expect(repository.listFoodProducts).toHaveBeenCalledWith({
			query: undefined,
			active: undefined,
			page: 1,
			pageSize: 20,
		});
	});

	test('gets and maps an inactive system product', async () => {
		repository.getFoodProductById.mockResolvedValueOnce(
			foodProductRow({ isActive: false }),
		);

		await expect(service.getFoodProduct(15)).resolves.toMatchObject({
			id: 15,
			isActive: false,
			nutritionPer100g: { calories: 120.5 },
		});
	});

	test('returns NOT_FOUND for an unavailable product', async () => {
		repository.getFoodProductById.mockResolvedValueOnce(null);

		await expect(service.getFoodProduct(999)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});

	test('creates and maps a system product', async () => {
		const input = {
			name: 'Oatmeal',
			nutritionPer100g: {
				calories: 120.5,
				proteinG: 4.5,
				fatG: 3.2,
				carbsG: 19.7,
			},
			isActive: true,
		};
		repository.createFoodProduct.mockResolvedValueOnce(foodProductRow());

		await expect(service.createFoodProduct(input)).resolves.toMatchObject({
			id: 15,
			name: 'Oatmeal',
			source: 'system',
		});
		expect(repository.createFoodProduct).toHaveBeenCalledWith(input);
	});

	test('partially updates and restores a system product', async () => {
		const updates = { isActive: true };
		repository.updateFoodProduct.mockResolvedValueOnce(
			foodProductRow({ isActive: true }),
		);

		await expect(service.updateFoodProduct(15, updates)).resolves.toMatchObject({
			id: 15,
			isActive: true,
		});
		expect(repository.updateFoodProduct).toHaveBeenCalledWith(15, updates);
	});

	test('returns NOT_FOUND when update cannot access a product', async () => {
		repository.updateFoodProduct.mockResolvedValueOnce(null);

		await expect(service.updateFoodProduct(999, { name: 'Unknown' }))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	test('deactivates a system product', async () => {
		repository.deactivateFoodProduct.mockResolvedValueOnce(true);

		await expect(service.deleteFoodProduct(15)).resolves.toBeUndefined();
		expect(repository.deactivateFoodProduct).toHaveBeenCalledWith(15);
	});

	test('returns NOT_FOUND when delete cannot access a product', async () => {
		repository.deactivateFoodProduct.mockResolvedValueOnce(false);

		await expect(service.deleteFoodProduct(999)).rejects.toMatchObject({
			status: 404,
			code: 'NOT_FOUND',
		});
	});
});
