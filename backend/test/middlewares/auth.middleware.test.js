const {
	requireRole,
} = require('../../src/modules/auth/auth.middleware');

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
