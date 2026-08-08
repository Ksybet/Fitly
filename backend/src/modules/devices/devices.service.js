const devicesRepository = require('./devices.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');

function toDeviceDto(device) {
	const dto = {
		id: Number(device.id),
		platform: device.platform,
		pushToken: device.pushToken,
		createdAt: device.createdAt instanceof Date
			? device.createdAt.toISOString()
			: device.createdAt,
		updatedAt: device.updatedAt instanceof Date
			? device.updatedAt.toISOString()
			: device.updatedAt,
	};
	if (device.appVersion !== null && device.appVersion !== undefined) {
		dto.appVersion = device.appVersion;
	}

	return dto;
}

async function registerDevice(userId, input) {
	const device = await devicesRepository.upsertDevice(
		ensureValidUserId(userId),
		input,
	);

	return toDeviceDto(device);
}

async function unregisterDevice(userId, deviceId) {
	const deleted = await devicesRepository.deleteDevice(
		ensureValidUserId(userId),
		deviceId,
	);

	if (!deleted) {
		throw new ApiError(404, 'Push device not found');
	}
}

module.exports = {
	toDeviceDto,
	registerDevice,
	unregisterDevice,
};
