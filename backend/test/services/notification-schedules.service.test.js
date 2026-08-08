jest.mock('../../src/modules/notifications/notification-schedules.repository', () => ({
	upsertRecurringSchedule: jest.fn(),
	cancelRecurringSchedule: jest.fn(),
	listRecurringSettings: jest.fn(),
}));

const schedulesRepository = require('../../src/modules/notifications/notification-schedules.repository');
const schedulesService = require('../../src/modules/notifications/notification-schedules.service');

describe('notification schedules service', () => {
	const client = { query: jest.fn() };

	beforeEach(() => jest.clearAllMocks());

	test('upserts the next water slot when reminders are enabled', async () => {
		schedulesRepository.upsertRecurringSchedule.mockResolvedValueOnce({ id: '1' });

		await schedulesService.syncWaterSchedule(client, 7, {
			timezone: 'Europe/Istanbul',
			notifications: {
				waterEnabled: true,
				waterIntervalMinutes: 120,
			},
		}, new Date('2026-08-08T10:15:00.000Z'));

		expect(schedulesRepository.upsertRecurringSchedule).toHaveBeenCalledWith(
			client,
			7,
			'water',
			new Date('2026-08-08T11:00:00.000Z'),
		);
	});

	test('cancels the schedule when water reminders are disabled', async () => {
		await schedulesService.syncWaterSchedule(client, 7, {
			timezone: 'UTC',
			notifications: { waterEnabled: false },
		});

		expect(schedulesRepository.cancelRecurringSchedule)
			.toHaveBeenCalledWith(client, 7, 'water');
	});
});
