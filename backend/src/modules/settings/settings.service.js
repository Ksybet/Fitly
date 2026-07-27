const settingsRepository = require('./settings.repository');
const { ensureValidUserId } = require('../../utils/validation');
const { toSettingsDto } = require('./settings.mapper');

async function getSettings(userId) {
	const settings = await settingsRepository.getSettings(
		ensureValidUserId(userId),
	);

	return toSettingsDto(settings);
}

async function updateSettings(userId, updates) {
	const settings = await settingsRepository.updateSettings(
		ensureValidUserId(userId),
		updates,
	);

	return toSettingsDto(settings);
}

module.exports = {
	getSettings,
	updateSettings,
};
