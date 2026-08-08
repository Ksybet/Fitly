jest.mock('../../src/modules/notifications/notification-worker.repository', () => ({
	claimDueSchedules: jest.fn(),
	completeSchedule: jest.fn(),
	reschedule: jest.fn(),
	releaseSchedule: jest.fn(),
	claimUnqueuedNotifications: jest.fn(),
	markNotificationQueued: jest.fn(),
	withTransaction: jest.fn(callback => callback({ query: jest.fn() })),
}));
jest.mock('../../src/modules/notifications/notification-schedules.repository', () => ({
	listRecurringSettings: jest.fn(),
}));
jest.mock('../../src/modules/notifications/notification-schedules.service', () => ({
	syncSettingsSchedules: jest.fn(),
}));
jest.mock('../../src/modules/notifications/notifications.repository', () => ({
	createNotification: jest.fn(),
}));
jest.mock('../../src/modules/notifications/notification-deliveries.repository', () => ({
	createForNotification: jest.fn(),
}));
jest.mock('../../src/modules/notifications/notification-delivery.service', () => ({
	sendPending: jest.fn(),
	checkReceipts: jest.fn(),
}));

const workerRepository =
	require('../../src/modules/notifications/notification-worker.repository');
const schedulesRepository =
	require('../../src/modules/notifications/notification-schedules.repository');
const schedulesService =
	require('../../src/modules/notifications/notification-schedules.service');
const notificationsRepository =
	require('../../src/modules/notifications/notifications.repository');
const deliveriesRepository =
	require('../../src/modules/notifications/notification-deliveries.repository');
const deliveryService =
	require('../../src/modules/notifications/notification-delivery.service');
const worker =
	require('../../src/modules/notifications/notification-worker.service');

describe('notification worker service', () => {
	const now = new Date('2026-08-08T20:30:00.000Z');

	beforeEach(() => {
		jest.clearAllMocks();
		workerRepository.claimDueSchedules.mockResolvedValue([]);
		workerRepository.claimUnqueuedNotifications.mockResolvedValue([]);
		deliveryService.sendPending.mockResolvedValue(0);
		deliveryService.checkReceipts.mockResolvedValue(0);
	});

	test('stores a due water reminder and advances to a future slot', async () => {
		const schedule = {
			id: '1',
			userId: 7,
			type: 'water',
			nextRunAt: new Date('2026-08-08T20:29:00.000Z'),
			timezone: 'UTC',
			notifications: { waterEnabled: true, waterIntervalMinutes: 120 },
		};

		await worker.processSchedule(schedule, now);

		expect(notificationsRepository.createNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 7,
				type: 'water',
				deduplicationKey: 'water:7:2026-08-08T20:29:00.000Z',
			}),
			expect.any(Object),
		);
		expect(workerRepository.reschedule).toHaveBeenCalledWith(
			expect.any(Object),
			'1',
			new Date('2026-08-08T22:00:00.000Z'),
		);
	});

	test('does not catch up a stale recurring reminder', async () => {
		await worker.processSchedule({
			id: '2',
			userId: 7,
			type: 'sleep',
			nextRunAt: new Date('2026-08-08T19:00:00.000Z'),
			timezone: 'UTC',
			notifications: { sleepEnabled: true, sleepReminderTime: '19:00' },
		}, now);

		expect(notificationsRepository.createNotification).not.toHaveBeenCalled();
		expect(workerRepository.reschedule).toHaveBeenCalledWith(
			expect.any(Object),
			'2',
			new Date('2026-08-09T19:00:00.000Z'),
		);
	});

	test('never sends a workout reminder after the workout starts', async () => {
		await worker.processSchedule({
			id: '3', userId: 7, type: 'workout', workoutPlanId: 9,
			nextRunAt: new Date('2026-08-08T20:00:00.000Z'),
			workoutScheduledAt: new Date('2026-08-08T20:30:00.000Z'),
			workoutStatus: 'scheduled',
			notifications: { workoutsEnabled: true },
		}, now);

		expect(notificationsRepository.createNotification).not.toHaveBeenCalled();
		expect(workerRepository.completeSchedule).toHaveBeenCalled();
	});

	test('skips reminder push during DND but defers achievement push', () => {
		const base = {
			timezone: 'Europe/Istanbul',
			notifications: {
				enabled: true,
				waterEnabled: true,
				achievementsEnabled: true,
				doNotDisturbEnabled: true,
				doNotDisturbFrom: '22:00',
				doNotDisturbTo: '07:00',
			},
		};

		expect(worker.deliveryTime({ ...base, type: 'water' }, now)).toBeNull();
		expect(worker.deliveryTime({ ...base, type: 'achievement' }, now))
			.toEqual(new Date('2026-08-09T04:00:00.000Z'));
	});

	test('marks notifications queued even when global push is disabled', async () => {
		workerRepository.claimUnqueuedNotifications.mockResolvedValueOnce([{
			id: '10', userId: 7, type: 'achievement', timezone: 'UTC',
			notifications: { enabled: false, achievementsEnabled: true },
		}]);

		await worker.queuePushDeliveries({ now });

		expect(deliveriesRepository.createForNotification).not.toHaveBeenCalled();
		expect(workerRepository.markNotificationQueued).toHaveBeenCalledWith(
			expect.any(Object), '10', now,
		);
	});

	test('runs schedule, queue, send and receipt phases with a fake adapter', async () => {
		workerRepository.claimDueSchedules.mockResolvedValueOnce([]);
		workerRepository.claimUnqueuedNotifications.mockResolvedValueOnce([]);
		deliveryService.sendPending.mockResolvedValueOnce(2);
		deliveryService.checkReceipts.mockResolvedValueOnce(1);
		const adapter = { send: jest.fn(), getReceipts: jest.fn() };

		await expect(worker.runWorkerCycle(adapter, { now, limit: 50 }))
			.resolves.toEqual({ schedules: 0, queued: 0, sent: 2, receipts: 1 });
		expect(deliveryService.sendPending).toHaveBeenCalledWith(
			adapter,
			expect.objectContaining({ now, limit: 50 }),
		);
	});

	test('restores schedules for existing users at worker startup', async () => {
		const settings = {
			userId: 7,
			timezone: 'UTC',
			notifications: { waterEnabled: true, waterIntervalMinutes: 120 },
		};
		schedulesRepository.listRecurringSettings.mockResolvedValueOnce([settings]);

		await expect(worker.restoreSchedules(now)).resolves.toBe(1);
		expect(schedulesService.syncSettingsSchedules).toHaveBeenCalledWith(
			expect.any(Object), 7, settings, now,
		);
	});
});
