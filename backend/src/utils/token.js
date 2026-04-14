const jwt = require('jsonwebtoken');
const env = require('../config/env');

function generateAccessToken(payload) {
	return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyAccessToken(token) {
	return jwt.verify(token, env.jwtSecret);
}

module.exports = {
	generateAccessToken,
	verifyAccessToken,
};
