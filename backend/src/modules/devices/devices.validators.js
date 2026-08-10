const { ApiError } = require('../../utils/api-error');
const {
	addDetail,
	validateObjectBody,
} = require('../../utils/request-validation');

const MAX_SQL_BIGINT_SAFE = Number.MAX_SAFE_INTEGER;
const DEVICE_FIELDS = new Set(['platform', 'pushToken', 'appVersion']);
const PLATFORMS = new Set(['ios', 'android']);
const EXPO_PUSH_TOKEN_PATTERN = /^(?:ExponentPushToken|ExpoPushToken)\[[^\]\s]{20,}\]$/;

function validationFailed(details) {
	return new ApiError(400, 'Request validation failed', { details });
}

function validateRegisterDeviceRequest(req, res, next) {
	const details = [];
	const body = req.body;

	if (validateObjectBody(body, {
		allowedFields: DEVICE_FIELDS,
		requiredFields: ['platform', 'pushToken'],
	}, details)) {
		if (typeof body.platform !== 'string' || !PLATFORMS.has(body.platform)) {
			addDetail(details, 'platform', 'INVALID_ENUM', 'platform must be ios or android');
		}
		if (
			typeof body.pushToken !== 'string'
			|| body.pushToken.length > 4096
			|| !EXPO_PUSH_TOKEN_PATTERN.test(body.pushToken)
		) {
			addDetail(
				details,
				'pushToken',
				'INVALID_FORMAT',
				'pushToken must be a valid Expo Push Token',
			);
		}
		if (
			body.appVersion !== undefined
			&& (
				typeof body.appVersion !== 'string'
				|| body.appVersion.length === 0
				|| body.appVersion.length > 30
			)
		) {
			addDetail(
				details,
				'appVersion',
				'INVALID_LENGTH',
				'appVersion must contain between 1 and 30 characters',
			);
		}
	}

	if (details.length > 0) {
		return next(validationFailed(details));
	}

	return next();
}

function validateDeviceId(req, res, next) {
	const value = req.params.deviceId;
	if (!/^[1-9]\d*$/.test(value) || Number(value) > MAX_SQL_BIGINT_SAFE) {
		return next(validationFailed([{
			field: 'deviceId',
			code: 'OUT_OF_RANGE',
			message: 'deviceId must be a positive integer',
		}]));
	}

	req.deviceId = Number(value);
	return next();
}

module.exports = {
	EXPO_PUSH_TOKEN_PATTERN,
	validateRegisterDeviceRequest,
	validateDeviceId,
};
