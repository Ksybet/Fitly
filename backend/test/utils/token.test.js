const jwt = require('jsonwebtoken');
const { generateAccessToken, verifyAccessToken } = require('../../src/utils/token');

describe('access token utilities', () => {
	test('generates and verifies an access token with the configured lifetime', () => {
		const token = generateAccessToken({ userId: 7, role: 'user' });
		const payload = verifyAccessToken(token);

		expect(payload).toMatchObject({ userId: 7, role: 'user' });
		expect(payload.exp - payload.iat).toBe(60 * 60);
	});

	test.each([
		['expired', () => jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: -1 })],
		['malformed', () => 'not-a-jwt'],
		['signed with another secret', () => jwt.sign({ userId: 7 }, 'different-secret')],
	])('rejects an %s token', (description, createToken) => {
		expect(() => verifyAccessToken(createToken())).toThrow();
	});
});
