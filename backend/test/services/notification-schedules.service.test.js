jest.mock('../../src/modules/notifications/notification-schedules.repository', () => ({
	upsertRecurringSchedule: jest.fn(),
	cancelRecurringSchedule: jest.fn(),
	listRecurringSettings: jest.fn(),
	upsertWorkoutSchedule: jest.fn(),
	cancelWorkoutSchedule: jest.fn(),
	cancelAllWorkoutSchedules: jest.fn(),
	listFutureWorkoutPlans: jest.fn(),
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

	test('upserts the next sleep time in the user timezone', async () => {
		schedulesRepository.upsertRecurringSchedule.mockResolvedValueOnce({ id: '2' });

		await schedulesService.syncSleepSchedule(client, 7, {
			timezone: 'Europe/Istanbul',
			notifications: {
				sleepEnabled: true,
				sleepReminderTime: '22:30',
			},
		}, new Date('2026-08-08T18:00:00.000Z'));

		expect(schedulesRepository.upsertRecurringSchedule).toHaveBeenCalledWith(
			client,
			7,
			'sleep',
			new Date('2026-08-08T19:30:00.000Z'),
		);
	});

	test('cancels the schedule when sleep reminders are disabled', async () => {
		await schedulesService.syncSleepSchedule(client, 7, {
			timezone: 'UTC',
			notifications: { sleepEnabled: false },
		});

		expect(schedulesRepository.cancelRecurringSchedule)
			.toHaveBeenCalledWith(client, 7, 'sleep');
	});

	test('upserts a future workout reminder from the plan value', async () => {
		schedulesRepository.upsertWorkoutSchedule.mockResolvedValueOnce({ id: '3' });
		const plan = {
			id: 9,
			scheduledAt: new Date('2026-08-08T15:00:00.000Z'),
			reminderMinutesBefore: 45,
		};

		await schedulesService.syncWorkoutSchedule(
			client,
			7,
			plan,
			{ notifications: { workoutsEnabled: true } },
			new Date('2026-08-08T10:00:00.000Z'),
		);

		expect(schedulesRepository.upsertWorkoutSchedule).toHaveBeenCalledWith(
			client,
			7,
			plan,
			new Date('2026-08-08T14:15:00.000Z'),
		);
	});

	test('cancels a stale workout reminder', async () => {
		await schedulesService.syncWorkoutSchedule(
			client,
			7,
			{
				id: 9,
				scheduledAt: new Date('2026-08-08T10:30:00.000Z'),
				reminderMinutesBefore: 60,
			},
			{ notifications: { workoutsEnabled: true } },
			new Date('2026-08-08T10:00:00.000Z'),
		);

		expect(schedulesRepository.cancelWorkoutSchedule)
			.toHaveBeenCalledWith(client, 7, 9);
	});
});
