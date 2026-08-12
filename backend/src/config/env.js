require('dotenv').config();

const DEFAULT_POSTBOX_REGION = 'ru-central1';
const DEFAULT_POSTBOX_ENDPOINT = 'https://postbox.cloud.yandex.net';
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePort(value) {
	if (value === undefined || value === '') {
		return 3000;
	}

	const port = Number(value);

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('PORT must be an integer between 1 and 65535');
	}

	return port;
}

function normalizeTrustProxyHops(value) {
	if (value === undefined || value === '') {
		return 1;
	}

	const hops = Number(value);

	if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
		throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10');
	}

	return hops;
}

function normalizeInteger(value, name, defaultValue, minimum, maximum) {
	if (value === undefined || value === '') {
		return defaultValue;
	}
	const number = Number(value);
	if (!Number.isInteger(number) || number < minimum || number > maximum) {
		throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
	}
	return number;
}

function normalizePostboxEndpoint(value) {
	const endpoint = value?.trim() || DEFAULT_POSTBOX_ENDPOINT;
	let parsed;
	try {
		parsed = new URL(endpoint);
	} catch {
		throw new Error('POSTBOX_ENDPOINT must be a valid HTTPS URL');
	}

	if (
		parsed.protocol !== 'https:'
		|| parsed.username
		|| parsed.password
		|| parsed.search
		|| parsed.hash
	) {
		throw new Error('POSTBOX_ENDPOINT must be a valid HTTPS URL');
	}

	return endpoint.replace(/\/+$/, '');
}

function getPostboxConfig() {
	const accessKeyId = process.env.POSTBOX_ACCESS_KEY_ID?.trim();
	const secretAccessKey = process.env.POSTBOX_SECRET_ACCESS_KEY;
	const fromEmail = process.env.POSTBOX_FROM_EMAIL?.trim();
	const missing = [];

	if (!accessKeyId) missing.push('POSTBOX_ACCESS_KEY_ID');
	if (!secretAccessKey?.trim()) missing.push('POSTBOX_SECRET_ACCESS_KEY');
	if (!fromEmail) missing.push('POSTBOX_FROM_EMAIL');

	if (missing.length > 0) {
		throw new Error(
			`${missing.join(', ')} environment variable${missing.length === 1 ? ' is' : 's are'} required to create the Postbox email adapter`,
		);
	}

	if (fromEmail.length > 254 || !EMAIL_ADDRESS_PATTERN.test(fromEmail)) {
		throw new Error('POSTBOX_FROM_EMAIL must be a valid email address');
	}

	return {
		accessKeyId,
		secretAccessKey,
		region: process.env.POSTBOX_REGION?.trim() || DEFAULT_POSTBOX_REGION,
		endpoint: normalizePostboxEndpoint(process.env.POSTBOX_ENDPOINT),
		fromEmail,
	};
}

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
	throw new Error('JWT_SECRET environment variable is required');
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
	throw new Error('DATABASE_URL environment variable is required');
}

module.exports = {
	NODE_ENV: process.env.NODE_ENV || 'development',
	HOST: process.env.HOST || '0.0.0.0',
	PORT: normalizePort(process.env.PORT),
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
	CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3001',
	DATABASE_URL: process.env.DATABASE_URL,
	TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
	ADMIN_EMAIL: process.env.ADMIN_EMAIL || undefined,
	ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || undefined,
	TRUST_PROXY_HOPS: normalizeTrustProxyHops(process.env.TRUST_PROXY_HOPS),
	SYSTEM_LOG_RETENTION_DAYS: normalizeInteger(
		process.env.SYSTEM_LOG_RETENTION_DAYS,
		'SYSTEM_LOG_RETENTION_DAYS',
		90,
		1,
		3650,
	),
	EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || undefined,
	NOTIFICATION_WORKER_POLL_MS: normalizeInteger(
		process.env.NOTIFICATION_WORKER_POLL_MS,
		'NOTIFICATION_WORKER_POLL_MS',
		5000,
		100,
		60000,
	),
	NOTIFICATION_WORKER_BATCH_SIZE: normalizeInteger(
		process.env.NOTIFICATION_WORKER_BATCH_SIZE,
		'NOTIFICATION_WORKER_BATCH_SIZE',
		100,
		1,
		100,
	),
	NOTIFICATION_WORKER_LEASE_SECONDS: normalizeInteger(
		process.env.NOTIFICATION_WORKER_LEASE_SECONDS,
		'NOTIFICATION_WORKER_LEASE_SECONDS',
		60,
		10,
		600,
	),
	getPostboxConfig,
};
