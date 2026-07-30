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

describe('nutrition repository daily queries', () => {
	beforeEach(() => jest.clearAllMocks());

	test('loads only entries inside the user local day', async () => {
		pool.query
			.mockResolvedValueOnce({
				rows: [{
					id: 4,
					mealType: 'breakfast',
					eatenAt: new Date('2026-07-29T21:30:00.000Z'),
					date: '2026-07-30',
					title: null,
					createdAt: new Date('2026-07-29T21:30:00.000Z'),
					updatedAt: new Date('2026-07-29T21:30:00.000Z'),
				}],
			})
			.mockResolvedValueOnce({
				rows: [{
					id: 9,
					mealEntryId: 4,
					productId: null,
					name: 'Meal',
					amountG: '100',
					per100gCalories: '10',
					per100gProteinG: '1',
					per100gFatG: '1',
					per100gCarbsG: '1',
					totalCalories: '10',
					totalProteinG: '1',
					totalFatG: '1',
					totalCarbsG: '1',
				}],
			});

		await expect(nutritionRepository.getMealsForDate(
			7,
			'2026-07-30',
			'Europe/Moscow',
		)).resolves.toEqual([{
			entry: expect.objectContaining({ id: 4, date: '2026-07-30' }),
			items: [expect.objectContaining({ id: 9, mealEntryId: 4 })],
		}]);

		expect(pool.query.mock.calls[0][0]).toContain(
			'eaten_at >= ($3::date::timestamp AT TIME ZONE $2)',
		);
		expect(pool.query.mock.calls[0][0]).toContain(
			'($3::date + 1)::timestamp AT TIME ZONE $2',
		);
		expect(pool.query.mock.calls[0][1]).toEqual([
			7,
			'Europe/Moscow',
			'2026-07-30',
		]);
		expect(pool.query.mock.calls[1][1]).toEqual([[4]]);
	});

	test('does not query meal items when the day is empty', async () => {
		pool.query.mockResolvedValueOnce({ rows: [] });

		await expect(nutritionRepository.getMealsForDate(
			7,
			'2026-07-30',
			'UTC',
		)).resolves.toEqual([]);
		expect(pool.query).toHaveBeenCalledTimes(1);
	});
});
