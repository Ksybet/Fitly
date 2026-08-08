const schedulesRepository = require('./notification-schedules.repository');
const { nextWaterRun, nextSleepRun } = require('./notification-time');

async function syncWaterSchedule(queryable, userId, settings, now = new Date()) {
	const preferences = settings.notifications ?? {};
	if (preferences.waterEnabled !== true) {
		await schedulesRepository.cancelRecurringSchedule(
			queryable,
			userId,
			'water',
		);
		return null;
	}

	const nextRunAt = nextWaterRun(
		now,
		settings.timezone ?? 'UTC',
		preferences.waterIntervalMinutes,
	);
	return schedulesRepository.upsertRecurringSchedule(
		queryable,
		userId,
		'water',
		nextRunAt,
	);
}

async function syncRecurringSchedules(queryable, userId, settings, now) {
	const water = await syncWaterSchedule(queryable, userId, settings, now);
	const sleep = await syncSleepSchedule(queryable, userId, settings, now);
	return { water, sleep };
}

async function syncSleepSchedule(queryable, userId, settings, now = new Date()) {
	const preferences = settings.notifications ?? {};
	if (preferences.sleepEnabled !== true) {
		await schedulesRepository.cancelRecurringSchedule(
			queryable,
			userId,
			'sleep',
		);
		return null;
	}

	const nextRunAt = nextSleepRun(
		now,
		settings.timezone ?? 'UTC',
		preferences.sleepReminderTime,
	);
	return schedulesRepository.upsertRecurringSchedule(
		queryable,
		userId,
		'sleep',
		nextRunAt,
	);
}

module.exports = {
	syncWaterSchedule,
	syncSleepSchedule,
	syncRecurringSchedules,
};
