const { isIP } = require('node:net');
const {
	createAdminLoginAttempt,
} = require('./admin-login-audit.repository');

function normalizeText(value, maxLength, fallback = null) {
	if (typeof value !== 'string' || !value.trim()) {
		return fallback;
	}

	return value.trim().slice(0, maxLength);
}

function normalizeIpAddress(value) {
	const normalizedValue = normalizeText(value, 45);
	return normalizedValue && isIP(normalizedValue)
		? normalizedValue
		: '0.0.0.0';
}

async function recordAdminLoginAttempt({
	user,
	succeeded,
	failureReason = null,
	ipAddress,
	device,
	appVersion,
}) {
	if (!user || user.role !== 'admin') {
		return null;
	}

	return createAdminLoginAttempt({
		userId: user.id,
		email: user.email,
		succeeded: Boolean(succeeded),
		failureReason: succeeded
			? null
			: normalizeText(failureReason, 50, 'authentication_failed'),
		ipAddress: normalizeIpAddress(ipAddress),
		device: normalizeText(device, 512, 'unknown'),
		appVersion: normalizeText(appVersion, 50),
	});
}

module.exports = {
	recordAdminLoginAttempt,
};
