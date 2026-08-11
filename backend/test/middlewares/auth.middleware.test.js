const {
	authMiddleware,
	requireRole,
} = require('../../src/modules/auth/auth.middleware');
const { verifyAccessToken } = require('../../src/utils/token');
const {
	recordUserActivity,
} = require('../../src/modules/user-activity/user-activity.service');

jest.mock('../../src/utils/token', () => ({
	verifyAccessToken: jest.fn(),
}));

describe('access token authentication middleware', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('records activity after validating an access token', async () => {
		const next = jest.fn();
		const payload = { userId: 7, role: 'user' };
		verifyAccessToken.mockReturnValue(payload);

		await authMiddleware({
			headers: { authorization: 'Bearer access-token' },
		}, {}, next);

		expect(recordUserActivity).toHaveBeenCalledWith(7);
		expect(next).toHaveBeenCalledWith();
	});

	test('does not record activity for an invalid token', async () => {
		const next = jest.fn();
		verifyAccessToken.mockImplementation(() => {
			throw new Error('invalid');
		});

		await authMiddleware({
			headers: { authorization: 'Bearer invalid-token' },
		}, {}, next);

		expect(recordUserActivity).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
	});

	test('continues the request when activity persistence fails', async () => {
		const next = jest.fn();
		const consoleError = jest.spyOn(console, 'error').mockImplementation();
		verifyAccessToken.mockReturnValue({ userId: 7, role: 'user' });
		recordUserActivity.mockRejectedValue(new Error('database unavailable'));

		await authMiddleware({
			headers: { authorization: 'Bearer access-token' },
		}, {}, next);

		expect(consoleError).toHaveBeenCalledWith(
			'Failed to persist authenticated user activity',
		);
		expect(next).toHaveBeenCalledWith();
		consoleError.mockRestore();
	});
});

describe('role authorization middleware', () => {
	test('rejects a missing authenticated user with 401', () => {
		const next = jest.fn();
		const middleware = requireRole('admin');

		middleware({}, {}, next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({
			status: 401,
			message: 'Unauthorized',
		}));
	});

	test.each([
		{ role: 'user' },
		{},
		{ role: 'operator' },
	])('rejects a disallowed role with 403', user => {
		const next = jest.fn();
		const middleware = requireRole('admin');

		middleware({ user }, {}, next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({
			status: 403,
			message: 'Forbidden',
		}));
	});

	test('allows an administrator role', () => {
		const next = jest.fn();
		const middleware = requireRole('admin');

		middleware({ user: { role: 'admin' } }, {}, next);

		expect(next).toHaveBeenCalledWith();
	});

	test('supports multiple allowed roles', () => {
		const next = jest.fn();
		const middleware = requireRole('admin', 'operator');

		middleware({ user: { role: 'operator' } }, {}, next);

		expect(next).toHaveBeenCalledWith();
	});
});
