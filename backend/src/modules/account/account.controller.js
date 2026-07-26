const { deleteAccount } = require('./account.service');
const { sendActionCompleted } = require('../../utils/http-response');

async function deleteMyAccount(req, res, next) {
	try {
		await deleteAccount(req.user.userId, req.body.password);
		return sendActionCompleted(res);
	} catch (error) {
		next(error);
	}
}

module.exports = { deleteMyAccount };
