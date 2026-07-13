jest.mock('../../src/modules/profile/profile.repository', () => ({
	findProfileByUserId: jest.fn(),
	createProfile: jest.fn(),
	updateProfileByUserId: jest.fn(),
}));
jest.mock('../../src/modules/user/user.repository', () => ({
	findUserById: jest.fn(),
	deleteUserById: jest.fn(),
}));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const bcrypt = require('bcryptjs');
const profileRepository = require('../../src/modules/profile/profile.repository');
const userRepository = require('../../src/modules/user/user.repository');
const { getProfile, updateProfile, deleteAccount } = require('../../src/modules/profile/profile.service');

describe('profile service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('creates an empty profile only when one does not exist', async () => {
		profileRepository.findProfileByUserId.mockResolvedValueOnce(null);
		profileRepository.createProfile.mockResolvedValueOnce({ userId: 1, firstName: '' });
		await expect(getProfile(1)).resolves.toEqual({ userId: 1, firstName: '' });
		expect(profileRepository.createProfile).toHaveBeenCalledWith(expect.objectContaining({
			userId: 1, heightCm: null, weightKg: null,
		}));

		profileRepository.findProfileByUserId.mockResolvedValueOnce({ userId: 1, firstName: 'Ada' });
		await expect(getProfile(1)).resolves.toEqual({ userId: 1, firstName: 'Ada' });
		expect(profileRepository.createProfile).toHaveBeenCalledTimes(1);
	});

	test('trims a partial profile update and preserves omitted fields', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue({
			firstName: 'Old', birthDate: '2000-01-01', gender: 'female', heightCm: 170, weightKg: 60,
		});
		profileRepository.updateProfileByUserId.mockResolvedValue({ firstName: 'Ada' });

		await updateProfile(1, { firstName: '  Ada  ' });
		expect(profileRepository.updateProfileByUserId).toHaveBeenCalledWith(1, expect.objectContaining({
			firstName: 'Ada', heightCm: 170, weightKg: 60,
		}));
	});

	test('requires a password and handles missing users, wrong passwords, and deletion', async () => {
		await expect(deleteAccount(1, '')).rejects.toMatchObject({ status: 400 });
		userRepository.findUserById.mockResolvedValueOnce(null);
		await expect(deleteAccount(1, 'secret')).rejects.toMatchObject({ status: 404 });
		userRepository.findUserById.mockResolvedValueOnce({ passwordHash: 'hash' });
		bcrypt.compare.mockResolvedValueOnce(false);
		await expect(deleteAccount(1, 'secret')).rejects.toMatchObject({ status: 401 });
		userRepository.findUserById.mockResolvedValueOnce({ passwordHash: 'hash' });
		bcrypt.compare.mockResolvedValueOnce(true);
		await expect(deleteAccount(1, 'secret')).resolves.toBe(true);
		expect(userRepository.deleteUserById).toHaveBeenCalledWith(1);
	});
});
