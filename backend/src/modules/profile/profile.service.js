const {
	findProfileByUserId,
	saveProfile,
} = require('./profile.repository');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const { toProfileDto } = require('./profile.mapper');

function hasOwn(object, property) {
	return Object.prototype.hasOwnProperty.call(object, property);
}

async function getProfile(userId) {
	const profile = await findProfileByUserId(ensureValidUserId(userId));

	if (!profile) {
		throw new ApiError(401, 'Unauthorized');
	}

	return toProfileDto(profile);
}

async function updateProfile(userId, data) {
	const normalizedUserId = ensureValidUserId(userId);
	const existingProfile = await findProfileByUserId(normalizedUserId);

	if (!existingProfile) {
		throw new ApiError(401, 'Unauthorized');
	}

	const updatedProfile = await saveProfile(
		normalizedUserId,
		{
			firstName: hasOwn(data, 'firstName')
				? data.firstName
				: existingProfile.firstName,
			birthDate: hasOwn(data, 'birthDate')
				? data.birthDate
				: existingProfile.birthDate,
			gender: hasOwn(data, 'gender')
				? data.gender
				: existingProfile.gender,
			heightCm: hasOwn(data, 'heightCm')
				? data.heightCm
				: existingProfile.heightCm,
			weightKg: hasOwn(data, 'weightKg')
				? data.weightKg
				: existingProfile.weightKg,
		},
		{ recordWeight: hasOwn(data, 'weightKg') },
	);

	return toProfileDto(updatedProfile);
}

module.exports = {
	getProfile,
	updateProfile,
};
