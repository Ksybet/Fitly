const adminAnalyticsRepository = require('./admin-analytics.repository');

async function getOverview({ from, to }) {
	const metrics = await adminAnalyticsRepository.getOverview({ from, to });

	return {
		from,
		to,
		registeredUsers: {
			value: Number(metrics.registeredUsers),
		},
		activeUsers: {
			value: Number(metrics.activeUsers),
		},
	};
}

module.exports = { getOverview };
