const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const SETTINGS_FIELDS = new Set([
	'theme',
	'language',
	'timezone',
	'quickAction',
	'aiEnabled',
	'notifications',
]);
const THEMES = new Set(['light', 'dark', 'system']);
const QUICK_ACTIONS = new Set([
	'water',
	'nutrition',
	'workout',
	'mood',
	'weight',
]);
const NOTIFICATION_FIELDS = new Set([
	'enabled',
	'waterEnabled',
	'waterIntervalMinutes',
	'sleepEnabled',
	'sleepReminderTime',
	'workoutsEnabled',
	'workoutReminderMinutesBefore',
	'achievementsEnabled',
	'doNotDisturbEnabled',
	'doNotDisturbFrom',
	'doNotDisturbTo',
]);
const BOOLEAN_NOTIFICATION_FIELDS = [
	'enabled',
	'waterEnabled',
	'sleepEnabled',
	'workoutsEnabled',
	'achievementsEnabled',
	'doNotDisturbEnabled',
];
const TIME_NOTIFICATION_FIELDS = [
	'sleepReminderTime',
	'doNotDisturbFrom',
	'doNotDisturbTo',
];
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function hasOwn(object, property) {
	return Object.prototype.hasOwnProperty.call(object, property);
}

function isValidTimeZone(timezone) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
		return true;
	} catch {
		return false;
	}
}

function validateNotifications(notifications, details) {
	if (
		notifications === null
		|| typeof notifications !== 'object'
		|| Array.isArray(notifications)
	) {
		addDetail(
			details,
			'notifications',
			'INVALID_TYPE',
			'notifications must be an object',
		);
		return;
	}

	for (const field of Object.keys(notifications)) {
		if (!NOTIFICATION_FIELDS.has(field)) {
			addDetail(
				details,
				`notifications.${field}`,
				'UNKNOWN_FIELD',
				`${field} is not allowed`,
			);
		}
	}

	for (const field of BOOLEAN_NOTIFICATION_FIELDS) {
		if (hasOwn(notifications, field) && typeof notifications[field] !== 'boolean') {
			addDetail(
				details,
				`notifications.${field}`,
				'INVALID_TYPE',
				`${field} must be a boolean`,
			);
		}
	}

	if (
		hasOwn(notifications, 'waterIntervalMinutes')
		&& (
			!Number.isInteger(notifications.waterIntervalMinutes)
			|| notifications.waterIntervalMinutes < 30
			|| notifications.waterIntervalMinutes > 1440
		)
	) {
		addDetail(
			details,
			'notifications.waterIntervalMinutes',
			'OUT_OF_RANGE',
			'waterIntervalMinutes must be an integer between 30 and 1440',
		);
	}

	if (
		hasOwn(notifications, 'workoutReminderMinutesBefore')
		&& (
			!Number.isInteger(notifications.workoutReminderMinutesBefore)
			|| notifications.workoutReminderMinutesBefore < 0
			|| notifications.workoutReminderMinutesBefore > 10080
		)
	) {
		addDetail(
			details,
			'notifications.workoutReminderMinutesBefore',
			'OUT_OF_RANGE',
			'workoutReminderMinutesBefore must be an integer between 0 and 10080',
		);
	}

	for (const field of TIME_NOTIFICATION_FIELDS) {
		if (
			hasOwn(notifications, field)
			&& (
				typeof notifications[field] !== 'string'
				|| !TIME_PATTERN.test(notifications[field])
			)
		) {
			addDetail(
				details,
				`notifications.${field}`,
				'INVALID_TIME',
				`${field} must use HH:mm format`,
			);
		}
	}
}

function validateUpdateSettingsRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: SETTINGS_FIELDS,
		minProperties: 1,
	}, details)) {
		if (hasOwn(body, 'theme') && !THEMES.has(body.theme)) {
			addDetail(details, 'theme', 'INVALID_ENUM', 'theme is invalid');
		}

		if (
			hasOwn(body, 'language')
			&& (
				typeof body.language !== 'string'
				|| body.language.length < 1
				|| body.language.length > 10
			)
		) {
			addDetail(
				details,
				'language',
				'INVALID_LENGTH',
				'language must contain between 1 and 10 characters',
			);
		}

		if (
			hasOwn(body, 'timezone')
			&& (
				typeof body.timezone !== 'string'
				|| body.timezone.length < 1
				|| body.timezone.length > 100
				|| !isValidTimeZone(body.timezone)
			)
		) {
			addDetail(
				details,
				'timezone',
				'INVALID_TIMEZONE',
				'timezone must be a valid IANA timezone',
			);
		}

		if (hasOwn(body, 'quickAction') && !QUICK_ACTIONS.has(body.quickAction)) {
			addDetail(
				details,
				'quickAction',
				'INVALID_ENUM',
				'quickAction is invalid',
			);
		}

		if (hasOwn(body, 'aiEnabled') && typeof body.aiEnabled !== 'boolean') {
			addDetail(
				details,
				'aiEnabled',
				'INVALID_TYPE',
				'aiEnabled must be a boolean',
			);
		}

		if (hasOwn(body, 'notifications')) {
			validateNotifications(body.notifications, details);
		}
	}

	if (details.length > 0) {
		return next(new ApiError(400, 'Request validation failed', { details }));
	}

	return next();
}

module.exports = {
	isValidTimeZone,
	validateUpdateSettingsRequest,
};
