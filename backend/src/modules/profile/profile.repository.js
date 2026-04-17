const profiles = [];

async function findProfileByUserId(userId) {
	return profiles.find(profile => profile.userId === userId) || null;
}

async function createProfile(profileData) {
	profiles.push(profileData);
	return profileData;
}

async function updateProfileByUserId(userId, updateData) {
	const profileIndex = profiles.findIndex(profile => profile.userId === userId);

	if (profileIndex === -1) {
		return null;
	}

	profiles[profileIndex] = {
		...profiles[profileIndex],
		...updateData,
		updatedAt: new Date().toISOString(),
	};

	return profiles[profileIndex];
}

module.exports = {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
};
