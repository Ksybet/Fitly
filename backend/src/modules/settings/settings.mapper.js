function toSettingsDto(settings) {
	return {
		theme: settings.theme,
		language: settings.language,
		timezone: settings.timezone,
		quickAction: settings.quickAction,
		aiEnabled: settings.aiEnabled,
		notifications: settings.notifications,
		updatedAt: settings.updatedAt instanceof Date
			? settings.updatedAt.toISOString()
			: settings.updatedAt,
	};
}

module.exports = { toSettingsDto };
