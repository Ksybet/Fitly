const settingsService = require('./settings.service');
const { sendSuccess } = require('../../utils/http-response');

async function getSettings(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const settings = await settingsService.getSettings(userId);

		return sendSuccess(res, settings);
	} catch (error) {
		next(error);
	}
}

async function updateSettings(req, res, next) {
	try {
		const userId = Number(req.user.userId || req.user.id);
		const settings = await settingsService.updateSettings(userId, req.body);

		return sendSuccess(res, settings);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getSettings,
	updateSettings,
};
