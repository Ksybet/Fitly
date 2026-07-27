const bcrypt = require('bcryptjs');
const { ApiError } = require('../../utils/api-error');
const { ensureValidUserId } = require('../../utils/validation');
const {
	findUserById,
	deleteUserById,
} = require('../user/user.repository');

async function deleteAccount(userId, password) {
	const normalizedUserId = ensureValidUserId(userId);
	const user = await findUserById(normalizedUserId);

	if (!user || !user.isActive) {
		throw new ApiError(401, 'Unauthorized');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		throw new ApiError(401, 'Invalid password', {
			code: 'INVALID_CREDENTIALS',
		});
	}

	await deleteUserById(normalizedUserId);
}

module.exports = { deleteAccount };
