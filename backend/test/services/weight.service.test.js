jest.mock('../../src/modules/weight/weight.repository', () => ({
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	getEntryById: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));

const weightRepository = require('../../src/modules/weight/weight.repository');
const weightService = require('../../src/modules/weight/weight.service');

const storedEntry = {
	id: '12',
	date: '2026-08-10',
	weightKg: '71.5',
	createdAt: new Date('2026-08-10T09:00:00.000Z'),
	updatedAt: new Date('2026-08-10T09:00:00.000Z'),
};

describe('weight service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('returns descending entries with pagination metadata', async () => {
		weightRepository.listEntries.mockResolvedValueOnce({
			entries: [storedEntry],
			total: 5,
		});

		await expect(weightService.listEntries('7', {
			from: '2026-08-01',
			to: '2026-08-31',
			page: 2,
			pageSize: 2,
		})).resolves.toEqual({
			items: [{
				id: 12,
				date: '2026-08-10',
				weightKg: 71.5,
				createdAt: '2026-08-10T09:00:00.000Z',
				updatedAt: '2026-08-10T09:00:00.000Z',
			}],
			meta: {
				page: 2,
				pageSize: 2,
				total: 5,
				totalPages: 3,
			},
		});
	});

	test('maps duplicate dates from create and update to 409', async () => {
		const duplicate = Object.assign(new Error('duplicate'), { code: '23505' });
		weightRepository.createEntry.mockRejectedValueOnce(duplicate);
		weightRepository.updateEntry.mockRejectedValueOnce(duplicate);

		await expect(weightService.createEntry(7, {
			date: '2026-08-10',
			weightKg: 71.5,
		})).rejects.toMatchObject({ status: 409, code: 'STATE_CONFLICT' });
		await expect(weightService.updateEntry(7, 12, {
			date: '2026-08-10',
			weightKg: 71.5,
		})).rejects.toMatchObject({ status: 409, code: 'STATE_CONFLICT' });
	});

	test('hides missing or foreign entries behind 404', async () => {
		weightRepository.getEntryById.mockResolvedValueOnce(null);
		weightRepository.updateEntry.mockResolvedValueOnce(null);
		weightRepository.deleteEntry.mockResolvedValueOnce(false);

		await expect(weightService.getEntry(7, 99))
			.rejects.toMatchObject({ status: 404 });
		await expect(weightService.updateEntry(7, 99, {
			date: '2026-08-10',
			weightKg: 71.5,
		})).rejects.toMatchObject({ status: 404 });
		await expect(weightService.deleteEntry(7, 99))
			.rejects.toMatchObject({ status: 404 });
	});
});
