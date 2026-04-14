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
			lastName: '',
			birthDate: null,
			gender: null,
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
		lastName:
			data.lastName !== undefined
				? data.lastName.trim()
				: existingProfile.lastName,
		birthDate:
			data.birthDate !== undefined ? data.birthDate : existingProfile.birthDate,
		gender: data.gender !== undefined ? data.gender : existingProfile.gender,
		heightCm:
			data.heightCm !== undefined ? data.heightCm : existingProfile.heightCm,
	};

	const updatedProfile = await updateProfileByUserId(userId, updateData);

	return updatedProfile;
}

module.exports = {
	getProfile,
	updateProfile,
};
