const { getProfile, updateProfile } = require('./profile.service');
const { sendSuccess } = require('../../utils/http-response');

async function getMyProfile(req, res, next) {
	try {
		const userId = req.user.userId;
		const profile = await getProfile(userId);

		return sendSuccess(res, profile);
	} catch (error) {
		next(error);
	}
}

async function updateMyProfile(req, res, next) {
	try {
		const userId = req.user.userId;
		const updatedProfile = await updateProfile(userId, req.body);

		return sendSuccess(res, updatedProfile);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getMyProfile,
	updateMyProfile,
};
