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

	test.each([null, 'invalid', 42, []])('rejects an invalid profile body %p', async data => {
		await expect(updateProfile(1, data)).rejects.toMatchObject({
			status: 400,
			message: 'Profile data is required',
		});
		expect(profileRepository.findProfileByUserId).not.toHaveBeenCalled();
		expect(profileRepository.updateProfileByUserId).not.toHaveBeenCalled();
	});

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

	test('rejects a non-string first name and accepts an explicit null', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue({
			firstName: 'Old', birthDate: null, gender: null, heightCm: null, weightKg: null,
		});

		await expect(updateProfile(1, { firstName: 42 })).rejects.toMatchObject({
			status: 400,
			message: 'firstName must be a string',
		});
		expect(profileRepository.updateProfileByUserId).not.toHaveBeenCalled();

		profileRepository.updateProfileByUserId.mockResolvedValueOnce({ firstName: null });
		await expect(updateProfile(1, { firstName: null })).resolves.toEqual({ firstName: null });
		expect(profileRepository.updateProfileByUserId).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ firstName: null }),
		);
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
