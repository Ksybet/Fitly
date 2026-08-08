require('dotenv').config();

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
	EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || undefined,
};
