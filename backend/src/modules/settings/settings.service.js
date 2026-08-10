const settingsRepository = require('./settings.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toSettingsDto } = require('./settings.mapper');
const { withTransaction } = require('../../utils/db-transaction');
const { ApiError } = require('../../utils/api-error');
const notificationSchedulesService =
	require('../notifications/notification-schedules.service');

function requiredSetting(field, message) {
	return new ApiError(400, 'Request validation failed', {
		details: [{ field, code: 'REQUIRED', message }],
	});
}

function validateEffectiveNotificationSettings(notifications = {}) {
	if (
		notifications.waterEnabled === true
		&& !Number.isInteger(notifications.waterIntervalMinutes)
	) {
		throw requiredSetting(
			'notifications.waterIntervalMinutes',
			'waterIntervalMinutes is required when water reminders are enabled',
		);
	}
	if (
		notifications.sleepEnabled === true
		&& typeof notifications.sleepReminderTime !== 'string'
	) {
		throw requiredSetting(
			'notifications.sleepReminderTime',
			'sleepReminderTime is required when sleep reminders are enabled',
		);
	}
	if (
		notifications.doNotDisturbEnabled === true
		&& (
			typeof notifications.doNotDisturbFrom !== 'string'
			|| typeof notifications.doNotDisturbTo !== 'string'
		)
	) {
		throw requiredSetting(
			'notifications.doNotDisturbFrom',
			'doNotDisturbFrom and doNotDisturbTo are required when DND is enabled',
		);
	}
}

async function getSettings(userId) {
	const settings = await settingsRepository.getSettings(
		ensureValidUserId(userId),
	);

	return toSettingsDto(settings);
}

async function updateSettings(userId, updates) {
	const normalizedUserId = ensureValidUserId(userId);
	return withTransaction(async client => {
		const current = await settingsRepository.getSettings(
			normalizedUserId,
			client,
		);
		const effectiveNotifications = {
			...(current.notifications ?? {}),
			...(updates.notifications ?? {}),
		};
		validateEffectiveNotificationSettings(effectiveNotifications);

		const settings = await settingsRepository.updateSettings(
			normalizedUserId,
			updates,
			client,
		);
		await notificationSchedulesService.syncSettingsSchedules(
			client,
			normalizedUserId,
			settings,
		);
		return toSettingsDto(settings);
	});
}

module.exports = {
	getSettings,
	updateSettings,
	validateEffectiveNotificationSettings,
};
