const { getProfile, updateProfile, deleteAccount } = require('./profile.service');

async function getMyProfile(req, res, next) {
	try {
		const userId = req.user.userId;
		const profile = await getProfile(userId);

		res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (error) {
		next(error);
	}
}

async function updateMyProfile(req, res, next) {
	try {
		const userId = req.user.userId;
		const updatedProfile = await updateProfile(userId, req.body);

		res.status(200).json({
			success: true,
			data: updatedProfile,
		});
	} catch (error) {
		next(error);
	}
}

async function deleteMyAccount(req, res, next) {
	try {
		const userId = req.user.userId;

		await deleteAccount(userId, req.body.password);

		res.status(200).json({
			success: true,
			message: 'Account deleted',
		});
	} catch (error) {
		next(error);
	}
}

module.exports = {
	getMyProfile,
	updateMyProfile,
	deleteMyAccount,
};
