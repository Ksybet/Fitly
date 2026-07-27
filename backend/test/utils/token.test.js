const jwt = require('jsonwebtoken');
const {
	generateAccessToken,
	verifyAccessToken,
	getAccessTokenExpiresIn,
	generateRefreshToken,
	hashRefreshToken,
} = require('../../src/utils/token');

describe('access token utilities', () => {
	test('generates and verifies an access token with the configured lifetime', () => {
		const token = generateAccessToken({ userId: 7, role: 'user' });
		const payload = verifyAccessToken(token);

		expect(payload).toMatchObject({ userId: 7, role: 'user' });
		expect(payload.exp - payload.iat).toBe(60 * 60);
		expect(getAccessTokenExpiresIn(token)).toBe(60 * 60);
	});

	test('creates opaque refresh tokens and hashes them deterministically', () => {
		const firstToken = generateRefreshToken();
		const secondToken = generateRefreshToken();

		expect(firstToken).toMatch(/^[A-Za-z0-9_-]{64}$/);
		expect(secondToken).not.toBe(firstToken);
		expect(hashRefreshToken(firstToken)).toMatch(/^[0-9a-f]{64}$/);
		expect(hashRefreshToken(firstToken)).toBe(hashRefreshToken(firstToken));
	});

	test.each([
		['expired', () => jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: -1 })],
		['malformed', () => 'not-a-jwt'],
		['signed with another secret', () => jwt.sign({ userId: 7 }, 'different-secret')],
	])('rejects an %s token', (description, createToken) => {
		expect(() => verifyAccessToken(createToken())).toThrow();
	});

	test('rejects expiration reads from malformed tokens', () => {
		expect(() => getAccessTokenExpiresIn('not-a-jwt')).toThrow(
			'Access token does not contain a valid expiration',
		);
	});
});
