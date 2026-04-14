require('dotenv').config();

module.exports = {
	port: process.env.PORT || 3000,
	host: process.env.HOST || '127.0.0.1',
	jwtSecret: process.env.JWT_SECRET || 'default_secret_key',
	jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
};
