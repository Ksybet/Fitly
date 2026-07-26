const {
	findProfileByUserId,
	createProfile,
	updateProfileByUserId,
} = require('./profile.repository');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../../utils/api-error');
const { findUserById, deleteUserById } = require('../user/user.repository');
const { ensureValidUserId } = require('../../utils/validation');

function hasOwn(object, property) {
	return Object.prototype.hasOwnProperty.call(object, property);
}

function normalizeFirstName(value) {
	if (value === null) return null;
	if (typeof value !== 'string') {
		throw new ApiError(400, 'firstName must be a string');
	}

	return value.trim();
}

async function getProfile(userId) {
	const normalizedUserId = ensureValidUserId(userId);
	let profile = await findProfileByUserId(normalizedUserId);

	if (!profile) {
		profile = await createProfile({
			userId: normalizedUserId,
			firstName: '',
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
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new ApiError(400, 'Profile data is required');
	}

	const normalizedUserId = ensureValidUserId(userId);
	const existingProfile = await getProfile(normalizedUserId);

	const updateData = {
		firstName:
			hasOwn(data, 'firstName')
				? normalizeFirstName(data.firstName)
				: existingProfile.firstName,

		birthDate:
			hasOwn(data, 'birthDate') ? data.birthDate : existingProfile.birthDate,

		gender: hasOwn(data, 'gender') ? data.gender : existingProfile.gender,

		heightCm:
			hasOwn(data, 'heightCm') ? data.heightCm : existingProfile.heightCm,

		weightKg:
			hasOwn(data, 'weightKg') ? data.weightKg : existingProfile.weightKg,

		updatedAt: new Date().toISOString(),
	};

	return updateProfileByUserId(normalizedUserId, updateData);
}

async function deleteAccount(userId, password) {
	if (!password) {
		throw new ApiError(400, 'Password is required');
	}

	const normalizedUserId = ensureValidUserId(userId);
	const user = await findUserById(normalizedUserId);

	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid password');
	}

	await deleteUserById(normalizedUserId);

	return true;
}

module.exports = {
	getProfile,
	updateProfile,
	deleteAccount,
};
