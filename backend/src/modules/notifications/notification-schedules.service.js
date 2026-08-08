const schedulesRepository = require('./notification-schedules.repository');
const { nextWaterRun } = require('./notification-time');

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
	return syncWaterSchedule(queryable, userId, settings, now);
}

module.exports = {
	syncWaterSchedule,
	syncRecurringSchedules,
};
