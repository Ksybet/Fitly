jest.mock('../../src/modules/diary/diary.repository', () => ({
	createEntry: jest.fn(),
	listEntries: jest.fn(),
	getEntryById: jest.fn(),
	updateEntry: jest.fn(),
	deleteEntry: jest.fn(),
}));
jest.mock('../../src/modules/settings/user-local-date.service', () => ({
	getUserTimezone: jest.fn(),
}));

const diaryRepository = require('../../src/modules/diary/diary.repository');
const { getUserTimezone } = require('../../src/modules/settings/user-local-date.service');
const diaryService = require('../../src/modules/diary/diary.service');

function diaryRow(overrides = {}) {
	return {
		id: '15',
		recordedAt: new Date('2026-08-10T09:30:00.000Z'),
		date: '2026-08-10',
		moodScore: 4,
		energyLevel: null,
		stressLevel: 2,
		tags: ['work'],
		symptoms: ['headache'],
		note: 'Feeling better',
		inputMethod: 'manual',
		createdAt: new Date('2026-08-10T09:31:00.000Z'),
		updatedAt: new Date('2026-08-10T09:31:00.000Z'),
		...overrides,
	};
}

describe('diary service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getUserTimezone.mockResolvedValue('Europe/Istanbul');
	});

	test('creates and maps a diary entry in the user timezone', async () => {
		const input = {
			recordedAt: '2026-08-10T12:30:00+03:00',
			moodScore: 4,
			energyLevel: null,
			stressLevel: 2,
			tags: ['work'],
			symptoms: ['headache'],
			note: 'Feeling better',
		};
		diaryRepository.createEntry.mockResolvedValueOnce(diaryRow());

		await expect(diaryService.createEntry('7', input)).resolves.toEqual({
			id: 15,
			recordedAt: '2026-08-10T09:30:00.000Z',
			date: '2026-08-10',
			moodScore: 4,
			energyLevel: null,
			stressLevel: 2,
			tags: ['work'],
			symptoms: ['headache'],
			note: 'Feeling better',
			inputMethod: 'manual',
			createdAt: '2026-08-10T09:31:00.000Z',
			updatedAt: '2026-08-10T09:31:00.000Z',
		});
		expect(getUserTimezone).toHaveBeenCalledWith(7);
		expect(diaryRepository.createEntry).toHaveBeenCalledWith(
			7,
			input,
			'Europe/Istanbul',
		);
	});

	test('lists entries with pagination metadata', async () => {
		const filters = {
			from: '2026-08-01',
			to: '2026-08-10',
			moodScore: 4,
			page: 2,
			pageSize: 10,
		};
		diaryRepository.listEntries.mockResolvedValueOnce({
			entries: [diaryRow()],
			total: 21,
		});

		await expect(diaryService.listEntries(7, filters)).resolves.toMatchObject({
			items: [{ id: 15, moodScore: 4 }],
			meta: {
				page: 2,
				pageSize: 10,
				total: 21,
				totalPages: 3,
			},
		});
		expect(diaryRepository.listEntries).toHaveBeenCalledWith(
			7,
			filters,
			'Europe/Istanbul',
		);
	});

	test('returns zero total pages for an empty list', async () => {
		diaryRepository.listEntries.mockResolvedValueOnce({ entries: [], total: 0 });

		await expect(diaryService.listEntries(7, { page: 1, pageSize: 20 }))
			.resolves.toEqual({
				items: [],
				meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
			});
	});

	test('gets an owned diary entry', async () => {
		diaryRepository.getEntryById.mockResolvedValueOnce(diaryRow());

		await expect(diaryService.getEntry(7, 15))
			.resolves.toMatchObject({ id: 15, date: '2026-08-10' });
		expect(diaryRepository.getEntryById).toHaveBeenCalledWith(
			7,
			15,
			'Europe/Istanbul',
		);
	});

	test('returns 404 when a diary entry is unavailable', async () => {
		diaryRepository.getEntryById.mockResolvedValueOnce(null);

		await expect(diaryService.getEntry(7, 999))
			.rejects.toMatchObject({ status: 404, message: 'Diary entry not found' });
	});

	test('passes explicit null values through a partial update', async () => {
		const patch = { energyLevel: null, stressLevel: null, note: null, symptoms: [] };
		diaryRepository.updateEntry.mockResolvedValueOnce(diaryRow({
			energyLevel: null,
			stressLevel: null,
			note: null,
			symptoms: [],
		}));

		await expect(diaryService.updateEntry(7, 15, patch)).resolves.toMatchObject({
			energyLevel: null,
			stressLevel: null,
			note: null,
			symptoms: [],
		});
		expect(diaryRepository.updateEntry).toHaveBeenCalledWith(
			7,
			15,
			patch,
			'Europe/Istanbul',
		);
	});

	test('returns 404 when update or delete cannot find an owned entry', async () => {
		diaryRepository.updateEntry.mockResolvedValueOnce(null);
		await expect(diaryService.updateEntry(7, 15, { note: 'Updated' }))
			.rejects.toMatchObject({ status: 404 });

		diaryRepository.deleteEntry.mockResolvedValueOnce(false);
		await expect(diaryService.deleteEntry(7, 15))
			.rejects.toMatchObject({ status: 404 });
	});

	test('deletes an owned diary entry', async () => {
		diaryRepository.deleteEntry.mockResolvedValueOnce(true);

		await expect(diaryService.deleteEntry(7, 15)).resolves.toBeUndefined();
		expect(diaryRepository.deleteEntry).toHaveBeenCalledWith(7, 15);
	});

	test('rejects an invalid user before timezone or repository access', async () => {
		await expect(diaryService.listEntries(0, { page: 1, pageSize: 20 }))
			.rejects.toMatchObject({ status: 400 });
		expect(getUserTimezone).not.toHaveBeenCalled();
		expect(diaryRepository.listEntries).not.toHaveBeenCalled();
	});
});
