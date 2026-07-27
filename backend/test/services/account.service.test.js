jest.mock('../../src/modules/user/user.repository', () => ({
	findUserById: jest.fn(),
	deleteUserById: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/modules/user/user.repository');
const { deleteAccount } = require('../../src/modules/account/account.service');

describe('account service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('does not reveal whether the account is missing or blocked', async () => {
		userRepository.findUserById.mockResolvedValueOnce(null);
		await expect(deleteAccount(1, 'password'))
			.rejects.toMatchObject({ status: 401 });

		userRepository.findUserById.mockResolvedValueOnce({ isActive: false });
		await expect(deleteAccount(1, 'password'))
			.rejects.toMatchObject({ status: 401 });
	});

	test('requires the current password before deleting the user', async () => {
		userRepository.findUserById.mockResolvedValue({
			isActive: true,
			passwordHash: 'hash',
		});
		bcrypt.compare.mockResolvedValueOnce(false);

		await expect(deleteAccount(1, 'wrong'))
			.rejects.toMatchObject({
				status: 401,
				code: 'INVALID_CREDENTIALS',
				message: 'Invalid password',
			});
		expect(userRepository.deleteUserById).not.toHaveBeenCalled();

		bcrypt.compare.mockResolvedValueOnce(true);
		await expect(deleteAccount(1, 'correct')).resolves.toBeUndefined();
		expect(userRepository.deleteUserById).toHaveBeenCalledWith(1);
	});
});
