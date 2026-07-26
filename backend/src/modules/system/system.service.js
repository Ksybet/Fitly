const systemRepository = require('./system.repository');
const { ApiError } = require('../../utils/api-error');

async function getHealth() {
	try {
		await systemRepository.checkDatabase();
	} catch (error) {
		throw new ApiError(503, 'Service temporarily unavailable', {
			cause: error,
		});
	}

	return {
		status: 'ok',
		database: 'ok',
		timestamp: new Date().toISOString(),
	};
}

module.exports = { getHealth };
