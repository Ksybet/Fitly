jest.mock('../../src/config/db', () => ({
	pool: {
		query: jest.fn(),
		connect: jest.fn(),
	},
}));

const { pool } = require('../../src/config/db');
const nutritionRepository =
	require('../../src/modules/nutrition/nutrition.repository');

function resolvedItem(name) {
	return {
		productId: null,
		name,
		amountG: 100,
		nutritionPer100g: {
			calories: 100,
			proteinG: 5,
			fatG: 2,
			carbsG: 10,
		},
		nutritionTotal: {
			calories: 100,
			proteinG: 5,
			fatG: 2,
			carbsG: 10,
		},
	};
}

describe('nutrition repository transactions', () => {
	beforeEach(() => jest.clearAllMocks());

	test('rolls back the whole meal when an item insert fails', async () => {
		const failure = new Error('item insert failed');
		const client = {
			query: jest.fn(),
			release: jest.fn(),
		};
		client.query
			.mockResolvedValueOnce()
			.mockResolvedValueOnce({ rows: [{ id: 9 }] })
			.mockResolvedValueOnce()
			.mockRejectedValueOnce(failure)
			.mockResolvedValueOnce();
		pool.connect.mockResolvedValueOnce(client);

		await expect(nutritionRepository.createMeal(7, {
			mealType: 'breakfast',
			eatenAt: '2026-07-30T08:00:00Z',
			title: null,
			items: [resolvedItem('First'), resolvedItem('Second')],
		}, 'UTC')).rejects.toBe(failure);

		expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
		expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
		expect(
			client.query.mock.calls.some(call => call[0] === 'COMMIT'),
		).toBe(false);
		expect(client.release).toHaveBeenCalledTimes(1);
	});

	test('rolls back a missing owned meal without replacing its items', async () => {
		const client = {
			query: jest.fn()
				.mockResolvedValueOnce()
				.mockResolvedValueOnce({ rows: [] })
				.mockResolvedValueOnce(),
			release: jest.fn(),
		};
		pool.connect.mockResolvedValueOnce(client);

		await expect(nutritionRepository.updateMeal(7, 99, {
			mealType: 'lunch',
			eatenAt: '2026-07-30T12:00:00Z',
			title: null,
			items: [resolvedItem('Lunch')],
		}, 'UTC')).resolves.toBeNull();

		expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
		expect(
			client.query.mock.calls.some(
				call => String(call[0]).includes('DELETE FROM meal_items'),
			),
		).toBe(false);
		expect(client.release).toHaveBeenCalledTimes(1);
	});
});
