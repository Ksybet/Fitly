const adminUsersService = require('./admin-users.service');
const { sendSuccess } = require('../../utils/http-response');

async function listUsers(req, res, next) {
	try {
		const result = await adminUsersService.listUsers(req.adminUsersQuery);
		return sendSuccess(res, result.items, { meta: result.meta });
	} catch (error) {
		return next(error);
	}
}

module.exports = { listUsers };
