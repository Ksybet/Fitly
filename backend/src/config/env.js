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

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
	throw new Error('JWT_SECRET environment variable is required');
}

module.exports = {
	NODE_ENV: process.env.NODE_ENV || 'development',
	HOST: process.env.HOST || '0.0.0.0',
	PORT: normalizePort(process.env.PORT),
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
	CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3001',
	DB_USER: process.env.DB_USER,
	DB_PASSWORD: process.env.DB_PASSWORD,
	DB_SERVER: process.env.DB_SERVER,
	DB_NAME: process.env.DB_NAME,
};
