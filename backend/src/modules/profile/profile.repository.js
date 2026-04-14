const profiles = [];

/**
 * Найти профиль по userId
 */
async function findProfileByUserId(userId) {
	return profiles.find(profile => profile.userId === userId) || null;
}

/**
 * Создать профиль по умолчанию
 */
async function createProfile(profileData) {
	profiles.push(profileData);
	return profileData;
}

/**
 * Обновить профиль по userId
 */
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
