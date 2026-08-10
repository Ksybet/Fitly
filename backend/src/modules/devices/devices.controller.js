const devicesService = require('./devices.service');
const { sendSuccess, sendDeleted } = require('../../utils/http-response');

async function registerDevice(req, res, next) {
	try {
		const device = await devicesService.registerDevice(req.user.userId, req.body);
		return sendSuccess(res, device);
	} catch (error) {
		return next(error);
	}
}

async function unregisterDevice(req, res, next) {
	try {
		await devicesService.unregisterDevice(req.user.userId, req.deviceId);
		return sendDeleted(res);
	} catch (error) {
		return next(error);
	}
}

module.exports = {
	registerDevice,
	unregisterDevice,
};
