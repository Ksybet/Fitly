jest.mock('../../src/modules/sleep/sleep.repository', () => ({
	getTodaySleep: jest.fn(),
	upsertTodaySleep: jest.fn(),
	listEntries: jest.fn(),
	createEntry: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserLocalDate: jest.fn(),
	getUserTimezone: jest.fn().mockResolvedValue('America/New_York'),
	getDateInTimeZone: jest.fn().mockReturnValue('2026-08-10'),
}));

const sleepRepository = require('../../src/modules/sleep/sleep.repository');
const {
	getDateInTimeZone,
} = require('../../src/modules/settings/user-local-date.service');
const sleepService = require('../../src/modules/sleep/sleep.service');

const input = {
	sleepStart: '2026-08-10T02:00:00.000Z',
	sleepEnd: '2026-08-10T10:00:00.000Z',
	sleepQuality: 4,
};
const stored = {
	id: 4,
	date: '2026-08-10',
	...input,
	durationMinutes: 480,
	createdAt: '2026-08-10T10:00:00.000Z',
	updatedAt: '2026-08-10T10:00:00.000Z',
};

describe('sleep history service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('lists mapped entries with pagination', async () => {
		sleepRepository.listEntries.mockResolvedValueOnce({
			entries: [stored],
			total: 3,
		});

		await expect(sleepService.listEntries(7, {
			page: 2,
			pageSize: 2,
		})).resolves.toEqual({
			items: [stored],
			meta: {
				page: 2,
				pageSize: 2,
				total: 3,
				totalPages: 2,
			},
		});
	});

	test('derives the entry date from sleepEnd in the user timezone', async () => {
		sleepRepository.createEntry.mockResolvedValueOnce(stored);

		await expect(sleepService.createEntry('7', input)).resolves.toEqual(stored);
		expect(getDateInTimeZone).toHaveBeenCalledWith(
			'America/New_York',
			new Date(input.sleepEnd),
		);
		expect(sleepRepository.createEntry)
			.toHaveBeenCalledWith(7, '2026-08-10', input);
	});

	test('rejects invalid intervals and maps duplicate dates', async () => {
		await expect(sleepService.createEntry(7, {
			...input,
			sleepEnd: input.sleepStart,
		})).rejects.toMatchObject({ status: 400 });

		sleepRepository.createEntry.mockRejectedValueOnce(
			Object.assign(new Error('duplicate'), { code: '23505' }),
		);
		await expect(sleepService.createEntry(7, input))
			.rejects.toMatchObject({ status: 409, code: 'STATE_CONFLICT' });
	});

	test('returns 404 for foreign update and delete targets', async () => {
		sleepRepository.updateEntry.mockResolvedValueOnce(null);
		sleepRepository.deleteEntry.mockResolvedValueOnce(false);

		await expect(sleepService.updateEntry(7, 99, input))
			.rejects.toMatchObject({ status: 404 });
		await expect(sleepService.deleteEntry(7, 99))
			.rejects.toMatchObject({ status: 404 });
	});
});
