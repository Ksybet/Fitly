jest.mock('../../src/modules/water/water.repository', () => ({
	getTodayWater: jest.fn(),
	setTodayWater: jest.fn(),
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserLocalDate: jest.fn(),
	getUserTimezone: jest.fn().mockResolvedValue('UTC'),
	getDateInTimeZone: jest.fn().mockReturnValue('2026-08-10'),
}));

const waterRepository = require('../../src/modules/water/water.repository');
const {
	getDateInTimeZone,
} = require('../../src/modules/settings/user-local-date.service');
const waterService = require('../../src/modules/water/water.service');

const stored = {
	id: '8',
	amountMl: '250',
	consumedAt: new Date('2026-08-10T12:00:00.000Z'),
	date: '2026-08-10',
	createdAt: new Date('2026-08-10T12:00:00.000Z'),
};
const day = {
	date: '2026-08-10',
	amountMl: 750,
	goalMl: 2000,
};

describe('water history service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists entries including a compatible daily aggregate', async () => {
		waterRepository.listEntries.mockResolvedValueOnce({
			entries: [{ ...stored, amountMl: 12000 }],
			total: 1,
		});

		await expect(waterService.listEntries(7, {
			page: 1,
			pageSize: 20,
		})).resolves.toEqual({
			items: [{
				id: 8,
				amountMl: 12000,
				consumedAt: '2026-08-10T12:00:00.000Z',
				date: '2026-08-10',
				createdAt: '2026-08-10T12:00:00.000Z',
			}],
			meta: {
				page: 1,
				pageSize: 20,
				total: 1,
				totalPages: 1,
			},
		});
	});

	test('creates an event and returns its recalculated day', async () => {
		waterRepository.createEntry.mockResolvedValueOnce(stored);
		waterRepository.getTodayWater.mockResolvedValueOnce(day);

		await expect(waterService.createEntry('7', {
			amountMl: 250,
			consumedAt: '2026-08-10T12:00:00.000Z',
		})).resolves.toEqual({
			entry: {
				id: 8,
				amountMl: 250,
				consumedAt: '2026-08-10T12:00:00.000Z',
				date: '2026-08-10',
				createdAt: '2026-08-10T12:00:00.000Z',
			},
			day: {
				...day,
				progressPercent: 37.5,
			},
		});
		expect(getDateInTimeZone).toHaveBeenCalledWith(
			'UTC',
			new Date('2026-08-10T12:00:00.000Z'),
		);
	});

	test('updates the stored local date only when consumedAt changes', async () => {
		waterRepository.updateEntry.mockResolvedValue(stored);

		await waterService.updateEntry(7, 8, { amountMl: 250 });
		expect(waterRepository.updateEntry)
			.toHaveBeenLastCalledWith(7, 8, null, { amountMl: 250 });

		await waterService.updateEntry(7, 8, {
			amountMl: 250,
			consumedAt: '2026-08-10T12:00:00.000Z',
		});
		expect(waterRepository.updateEntry).toHaveBeenLastCalledWith(
			7,
			8,
			'2026-08-10',
			expect.objectContaining({ consumedAt: expect.any(String) }),
		);
	});

	test('hides missing update and delete targets behind 404', async () => {
		waterRepository.updateEntry.mockResolvedValueOnce(null);
		waterRepository.deleteEntry.mockResolvedValueOnce(false);

		await expect(waterService.updateEntry(7, 99, { amountMl: 250 }))
			.rejects.toMatchObject({ status: 404 });
		await expect(waterService.deleteEntry(7, 99))
			.rejects.toMatchObject({ status: 404 });
	});
});
