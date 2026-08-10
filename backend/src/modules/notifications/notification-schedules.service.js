const schedulesRepository = require('./notification-schedules.repository');
const { nextWaterRun, nextSleepRun } = require('./notification-time');

async function syncWaterSchedule(
	queryable,
	userId,
	settings,
	now = new Date(Date.now()),
) {
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

function workoutReminderAt(workoutPlan) {
	return new Date(
		new Date(workoutPlan.scheduledAt).getTime()
		- Number(workoutPlan.reminderMinutesBefore) * 60 * 1000,
	);
}

async function syncWorkoutSchedule(
	queryable,
	userId,
	workoutPlan,
	settings,
	now = new Date(Date.now()),
) {
	const preferences = settings.notifications ?? {};
	const nextRunAt = workoutReminderAt(workoutPlan);
	if (
		preferences.workoutsEnabled !== true
		|| nextRunAt.getTime() <= now.getTime()
	) {
		await schedulesRepository.cancelWorkoutSchedule(
			queryable,
			userId,
			workoutPlan.id,
		);
		return null;
	}

	return schedulesRepository.upsertWorkoutSchedule(
		queryable,
		userId,
		workoutPlan,
		nextRunAt,
	);
}

async function cancelWorkoutSchedule(queryable, userId, workoutPlanId) {
	return schedulesRepository.cancelWorkoutSchedule(
		queryable,
		userId,
		workoutPlanId,
	);
}

async function syncWorkoutSchedules(
	queryable,
	userId,
	settings,
	now = new Date(Date.now()),
) {
	if (settings.notifications?.workoutsEnabled !== true) {
		await schedulesRepository.cancelAllWorkoutSchedules(queryable, userId);
		return [];
	}
	const workoutPlans = await schedulesRepository.listFutureWorkoutPlans(
		queryable,
		userId,
		now,
	);
	const schedules = [];
	for (const workoutPlan of workoutPlans) {
		const schedule = await syncWorkoutSchedule(
			queryable,
			userId,
			workoutPlan,
			settings,
			now,
		);
		if (schedule) {
			schedules.push(schedule);
		}
	}
	return schedules;
}

async function syncSettingsSchedules(queryable, userId, settings, now) {
	const recurring = await syncRecurringSchedules(
		queryable,
		userId,
		settings,
		now,
	);
	const workouts = await syncWorkoutSchedules(
		queryable,
		userId,
		settings,
		now,
	);
	return { ...recurring, workouts };
}

async function syncSleepSchedule(
	queryable,
	userId,
	settings,
	now = new Date(Date.now()),
) {
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
	workoutReminderAt,
	syncWorkoutSchedule,
	cancelWorkoutSchedule,
	syncWorkoutSchedules,
	syncSettingsSchedules,
};
