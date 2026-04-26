const {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
} = require('./profile.repository');

async function getProfile(userId) {
	let profile = await findProfileByUserId(userId);

	if (!profile) {
		profile = await createProfile({
			userId,
			firstName: '',
			birthDate: null,
			gender: null,
			weightKg: null,
			heightCm: null,
			updatedAt: new Date().toISOString(),
		});
	}

	return profile;
}

async function updateProfile(userId, data) {
	const existingProfile = await getProfile(userId);

	const updateData = {
		firstName:
			data.firstName !== undefined
				? data.firstName.trim()
				: existingProfile.firstName,

		birthDate:
			data.birthDate !== undefined ? data.birthDate : existingProfile.birthDate,

		gender: data.gender !== undefined ? data.gender : existingProfile.gender,

		weightKg:
			data.weightKg !== undefined ? data.weightKg : existingProfile.weightKg,

		heightCm:
			data.heightCm !== undefined ? data.heightCm : existingProfile.heightCm,

		updatedAt: new Date().toISOString(),
	};

	return await updateProfileByUserId(userId, updateData);
}

module.exports = {
	getProfile,
	updateProfile,
};
