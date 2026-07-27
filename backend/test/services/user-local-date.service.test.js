jest.mock('../../src/modules/settings/settings.repository', () => ({
	getTimezoneByUserId: jest.fn(),
}));

const settingsRepository = require('../../src/modules/settings/settings.repository');
const {
	getDateInTimeZone,
	getUserLocalDate,
} = require('../../src/modules/settings/user-local-date.service');

describe('user local date service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test.each([
		['UTC', '2026-07-27T00:30:00.000Z', '2026-07-27'],
		['America/Los_Angeles', '2026-07-27T00:30:00.000Z', '2026-07-26'],
		['Pacific/Kiritimati', '2026-07-27T12:30:00.000Z', '2026-07-28'],
		['Asia/Tokyo', '2026-12-31T16:30:00.000Z', '2027-01-01'],
	])('calculates the local date in %s', (timezone, instant, expectedDate) => {
		expect(getDateInTimeZone(timezone, new Date(instant))).toBe(expectedDate);
	});

	test('calculates the date across a daylight-saving transition', () => {
		expect(getDateInTimeZone(
			'America/New_York',
			new Date('2026-03-08T06:59:59.000Z'),
		)).toBe('2026-03-08');
		expect(getDateInTimeZone(
			'America/New_York',
			new Date('2026-03-08T07:00:00.000Z'),
		)).toBe('2026-03-08');
	});

	test('loads the user timezone before calculating the date', async () => {
		settingsRepository.getTimezoneByUserId
			.mockResolvedValueOnce('America/Los_Angeles');

		await expect(getUserLocalDate(
			7,
			new Date('2026-07-27T00:30:00.000Z'),
		)).resolves.toBe('2026-07-26');
		expect(settingsRepository.getTimezoneByUserId).toHaveBeenCalledWith(7);
	});
});
