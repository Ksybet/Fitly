jest.mock('../../src/modules/profile/profile.repository', () => ({
	findProfileByUserId: jest.fn(),
	saveProfile: jest.fn(),
}));

const profileRepository = require('../../src/modules/profile/profile.repository');
const {
	getProfile,
	updateProfile,
} = require('../../src/modules/profile/profile.service');

const storedProfile = {
	userId: 1,
	email: 'user@example.com',
	firstName: 'Ada',
	birthDate: '2000-01-02',
	gender: 'female',
	heightCm: 170,
	weightKg: 68,
	updatedAt: '2026-07-26T10:00:00.000Z',
};

describe('profile service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('returns the contract DTO with calculated age and BMI', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue(storedProfile);

		const profile = await getProfile(1);

		expect(profile).toEqual({
			...storedProfile,
			age: expect.any(Number),
			bmi: 23.53,
		});
		expect(profile).not.toHaveProperty('id');
	});

	test('rejects a token subject that no longer has a user', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue(null);
		await expect(getProfile(1)).rejects.toMatchObject({ status: 401 });
	});

	test('preserves omitted values during the documented partial PUT', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue(storedProfile);
		profileRepository.saveProfile.mockResolvedValue({
			...storedProfile,
			firstName: 'Grace',
		});

		await updateProfile(1, { firstName: 'Grace' });

		expect(profileRepository.saveProfile).toHaveBeenCalledWith(
			1,
			{
				firstName: 'Grace',
				birthDate: storedProfile.birthDate,
				gender: storedProfile.gender,
				heightCm: storedProfile.heightCm,
				weightKg: storedProfile.weightKg,
			},
			{ recordWeight: false },
		);
	});

	test('requests a daily weight upsert only when weightKg is supplied', async () => {
		profileRepository.findProfileByUserId.mockResolvedValue(storedProfile);
		profileRepository.saveProfile.mockResolvedValue({
			...storedProfile,
			weightKg: 67.5,
		});

		await expect(updateProfile(1, { weightKg: 67.5 }))
			.resolves.toMatchObject({ weightKg: 67.5 });

		expect(profileRepository.saveProfile).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ weightKg: 67.5 }),
			{ recordWeight: true },
		);
	});
});
