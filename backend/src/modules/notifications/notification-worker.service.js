const workerRepository = require('./notification-worker.repository');
const schedulesRepository = require('./notification-schedules.repository');
const schedulesService = require('./notification-schedules.service');
const notificationsRepository = require('./notifications.repository');
const deliveriesRepository = require('./notification-deliveries.repository');
const deliveryService = require('./notification-delivery.service');
const {
	nextWaterRun,
	nextSleepRun,
	activeDoNotDisturbEnd,
} = require('./notification-time');

const STALE_GRACE_MS = 5 * 60 * 1000;
const DEFERRED_DND_TYPES = new Set(['achievement', 'system', 'support']);
const QUIET_DND_TYPES = new Set(['water', 'sleep', 'workout']);

const notificationContent = {
	water: {
		title: 'Пора выпить воды',
		body: 'Поддерживайте водный баланс — выпейте стакан воды.',
	},
	sleep: {
		title: 'Время готовиться ко сну',
		body: 'Пора завершать день и готовиться ко сну.',
	},
};

function typeEnabled(type, preferences) {
	if (type === 'water') return preferences.waterEnabled === true;
	if (type === 'sleep') return preferences.sleepEnabled === true;
	if (type === 'workout') return preferences.workoutsEnabled === true;
	if (type === 'achievement') return preferences.achievementsEnabled === true;
	return true;
}

function deliveryTime(notification, now) {
	const preferences = notification.notifications ?? {};
	if (preferences.enabled !== true || !typeEnabled(notification.type, preferences)) {
		return null;
	}
	if (preferences.doNotDisturbEnabled !== true) {
		return now;
	}
	const dndEnd = activeDoNotDisturbEnd(
		now,
		notification.timezone ?? 'UTC',
		preferences.doNotDisturbFrom,
		preferences.doNotDisturbTo,
	);
	if (!dndEnd) {
		return now;
	}
	if (QUIET_DND_TYPES.has(notification.type)) {
		return null;
	}
	return DEFERRED_DND_TYPES.has(notification.type) ? dndEnd : now;
}

function nextRecurringRun(schedule, now) {
	const preferences = schedule.notifications ?? {};
	if (schedule.type === 'water') {
		return nextWaterRun(
			now,
			schedule.timezone ?? 'UTC',
			preferences.waterIntervalMinutes,
		);
	}
	return nextSleepRun(
		now,
		schedule.timezone ?? 'UTC',
		preferences.sleepReminderTime,
	);
}

function isStale(schedule, now) {
	return now.getTime() - new Date(schedule.nextRunAt).getTime() > STALE_GRACE_MS;
}

function scheduleNotification(schedule) {
	if (schedule.type === 'workout') {
		return {
			title: 'Скоро тренировка',
			body: `Тренировка «${schedule.workoutTitle}» скоро начнётся.`,
			payload: { workoutPlanId: schedule.workoutPlanId },
		};
	}
	return { ...notificationContent[schedule.type], payload: {} };
}

async function processSchedule(schedule, now) {
	const preferences = schedule.notifications ?? {};
	return workerRepository.withTransaction(async client => {
		if (!typeEnabled(schedule.type, preferences)) {
			await workerRepository.completeSchedule(client, schedule.id);
			return false;
		}
		if (schedule.type === 'workout') {
			if (
				schedule.workoutStatus !== 'scheduled'
				|| !schedule.workoutScheduledAt
				|| new Date(schedule.workoutScheduledAt).getTime() <= now.getTime()
			) {
				await workerRepository.completeSchedule(client, schedule.id);
				return false;
			}
		} else if (isStale(schedule, now)) {
			await workerRepository.reschedule(
				client,
				schedule.id,
				nextRecurringRun(schedule, now),
			);
			return false;
		}

		const content = scheduleNotification(schedule);
		await notificationsRepository.createNotification({
			userId: schedule.userId,
			type: schedule.type,
			...content,
			scheduledAt: schedule.nextRunAt,
			deduplicationKey: schedule.type === 'workout'
				? `workout:${schedule.workoutPlanId}`
				: `${schedule.type}:${schedule.userId}:${new Date(schedule.nextRunAt).toISOString()}`,
		}, client);

		if (schedule.type === 'workout') {
			await workerRepository.completeSchedule(client, schedule.id);
		} else {
			await workerRepository.reschedule(
				client,
				schedule.id,
				nextRecurringRun(schedule, now),
			);
		}
		return true;
	});
}

async function processDueSchedules(options = {}) {
	const now = options.now ?? new Date();
	const schedules = await workerRepository.claimDueSchedules(
		now,
		options.limit ?? 100,
		options.leaseSeconds ?? 60,
	);
	for (const schedule of schedules) {
		try {
			await processSchedule(schedule, now);
		} catch (error) {
			await workerRepository.releaseSchedule(undefined, schedule.id);
			throw error;
		}
	}
	return schedules.length;
}

async function queuePushDeliveries(options = {}) {
	const now = options.now ?? new Date();
	const notifications = await workerRepository.claimUnqueuedNotifications(
		now,
		options.limit ?? 100,
		options.leaseSeconds ?? 60,
	);
	for (const notification of notifications) {
		await workerRepository.withTransaction(async client => {
			const availableAt = deliveryTime(notification, now);
			if (availableAt) {
				await deliveriesRepository.createForNotification(
					client,
					notification.id,
					notification.userId,
					availableAt,
				);
			}
			await workerRepository.markNotificationQueued(
				client,
				notification.id,
				now,
			);
		});
	}
	return notifications.length;
}

async function restoreSchedules(now = new Date()) {
	const settingsRows = await schedulesRepository.listRecurringSettings();
	for (const settings of settingsRows) {
		await workerRepository.withTransaction(client => (
			schedulesService.syncSettingsSchedules(
				client,
				settings.userId,
				settings,
				now,
			)
		));
	}
	return settingsRows.length;
}

async function runWorkerCycle(adapter, options = {}) {
	const now = options.now ?? new Date();
	const common = {
		now,
		limit: options.limit ?? 100,
		leaseSeconds: options.leaseSeconds ?? 60,
	};
	const schedules = await processDueSchedules(common);
	const queued = await queuePushDeliveries(common);
	const sent = await deliveryService.sendPending(adapter, common);
	const receipts = await deliveryService.checkReceipts(adapter, common);
	return { schedules, queued, sent, receipts };
}

module.exports = {
	STALE_GRACE_MS,
	typeEnabled,
	deliveryTime,
	isStale,
	processSchedule,
	processDueSchedules,
	queuePushDeliveries,
	restoreSchedules,
	runWorkerCycle,
};
