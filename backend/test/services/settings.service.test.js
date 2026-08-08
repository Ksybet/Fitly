jest.mock('../../src/modules/settings/settings.repository', () => ({
	getSettings: jest.fn(),
	updateSettings: jest.fn(),
}));
jest.mock('../../src/utils/db-transaction', () => ({
	withTransaction: jest.fn(callback => callback({ query: jest.fn() })),
}));
jest.mock('../../src/modules/notifications/notification-schedules.service', () => ({
	syncRecurringSchedules: jest.fn(),
}));

const settingsRepository = require('../../src/modules/settings/settings.repository');
const settingsService = require('../../src/modules/settings/settings.service');

function settingsRow(overrides = {}) {
	return {
		theme: 'system',
		language: 'ru',
		timezone: 'UTC',
		quickAction: 'water',
		aiEnabled: false,
		notifications: {},
		updatedAt: new Date('2026-07-27T10:00:00.000Z'),
		...overrides,
	};
}

describe('settings service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns the documented defaults as a settings DTO', async () => {
		settingsRepository.getSettings.mockResolvedValueOnce(settingsRow());

		await expect(settingsService.getSettings('7')).resolves.toEqual({
			theme: 'system',
			language: 'ru',
			timezone: 'UTC',
			quickAction: 'water',
			aiEnabled: false,
			notifications: {},
			updatedAt: '2026-07-27T10:00:00.000Z',
		});
		expect(settingsRepository.getSettings).toHaveBeenCalledWith(7);
	});

	test('passes a partial update to the repository and maps the result', async () => {
		settingsRepository.getSettings.mockResolvedValueOnce(settingsRow());
		settingsRepository.updateSettings.mockResolvedValueOnce(settingsRow({
			timezone: 'Europe/Tallinn',
			notifications: {
				enabled: true,
				waterEnabled: false,
			},
		}));

		await expect(settingsService.updateSettings(7, {
			timezone: 'Europe/Tallinn',
			notifications: { waterEnabled: false },
		})).resolves.toMatchObject({
			timezone: 'Europe/Tallinn',
			notifications: {
				enabled: true,
				waterEnabled: false,
			},
		});
		expect(settingsRepository.updateSettings).toHaveBeenCalledWith(
			7,
			{
				timezone: 'Europe/Tallinn',
				notifications: { waterEnabled: false },
			},
			expect.any(Object),
		);
	});

	test('rejects enabling water reminders without an effective interval', async () => {
		settingsRepository.getSettings.mockResolvedValueOnce(settingsRow());

		await expect(settingsService.updateSettings(7, {
			notifications: { waterEnabled: true },
		})).rejects.toMatchObject({
			status: 400,
			details: [expect.objectContaining({
				field: 'notifications.waterIntervalMinutes',
				code: 'REQUIRED',
			})],
		});
		expect(settingsRepository.updateSettings).not.toHaveBeenCalled();
	});
});
