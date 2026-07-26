const jwt = require('jsonwebtoken');
const { createHash, randomBytes } = require('node:crypto');
const env = require('../config/env');

function generateAccessToken(payload) {
	return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyAccessToken(token) {
	return jwt.verify(token, env.JWT_SECRET);
}

function getAccessTokenExpiresIn(token) {
	const payload = jwt.decode(token);

	if (
		!payload
		|| typeof payload.iat !== 'number'
		|| typeof payload.exp !== 'number'
		|| payload.exp <= payload.iat
	) {
		throw new Error('Access token does not contain a valid expiration');
	}

	return payload.exp - payload.iat;
}

function generateRefreshToken() {
	return randomBytes(48).toString('base64url');
}

function hashRefreshToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

module.exports = {
	generateAccessToken,
	verifyAccessToken,
	getAccessTokenExpiresIn,
	generateRefreshToken,
	hashRefreshToken,
};
