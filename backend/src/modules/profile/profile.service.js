const {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
} = require('./profile.repository');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../../utils/api-error');
const { findUserById, deleteUserById } = require('../user/user.repository');

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
			weightKg: null,
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

		weightKg:
			data.weightKg !== undefined ? data.weightKg : existingProfile.weightKg,

		updatedAt: new Date().toISOString(),
	};

	const updatedProfile = await updateProfileByUserId(userId, updateData);

	return updatedProfile;
}

async function deleteAccount(userId, password) {
	if (!password) {
		throw new ApiError(400, 'Password is required');
	}

	const user = await findUserById(userId);

	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid password');
	}

	await deleteUserById(userId);

	return true;
}

module.exports = {
	getProfile,
	updateProfile,
	deleteAccount,
};
