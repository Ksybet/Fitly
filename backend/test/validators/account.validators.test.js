const {
	validateDeleteAccountRequest,
} = require('../../src/modules/account/account.validators');

describe('account request validation', () => {
	test('allows additional fields because the inline OpenAPI schema does not forbid them', () => {
		const next = jest.fn();

		validateDeleteAccountRequest({
			body: {
				password: '',
				confirmation: 'DELETE',
				clientContext: 'ignored',
			},
		}, {}, next);

		expect(next).toHaveBeenCalledWith();
	});

	test('still requires string password and exact confirmation', () => {
		const next = jest.fn();

		validateDeleteAccountRequest({
			body: {
				password: 123,
				confirmation: 'delete',
			},
		}, {}, next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({
			status: 400,
			code: 'VALIDATION_ERROR',
			details: expect.arrayContaining([
				expect.objectContaining({ field: 'password' }),
				expect.objectContaining({ field: 'confirmation' }),
			]),
		}));
	});
});
