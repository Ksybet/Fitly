const env = require('../../config/env');
const logRepository = require('./log.repository');
const logger = require('./logger');

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

function retentionCutoff(retentionDays, now = new Date()) {
	return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

async function deleteExpiredLogs(
	retentionDays = env.SYSTEM_LOG_RETENTION_DAYS,
	now = new Date(),
) {
	return logRepository.deleteLogsBefore(retentionCutoff(retentionDays, now));
}

function startLogRetention({
	retentionDays = env.SYSTEM_LOG_RETENTION_DAYS,
	intervalMs = RETENTION_INTERVAL_MS,
} = {}) {
	let stopped = false;
	const runCleanup = async () => {
		if (stopped) return;
		try {
			await deleteExpiredLogs(retentionDays);
		} catch (error) {
			await logger.warning('System log retention cleanup failed', {
				service: 'api.logging',
				error,
				retentionDays,
			});
		}
	};

	void runCleanup();
	const timer = setInterval(runCleanup, intervalMs);
	if (typeof timer.unref === 'function') timer.unref();

	return () => {
		stopped = true;
		clearInterval(timer);
	};
}

module.exports = {
	RETENTION_INTERVAL_MS,
	retentionCutoff,
	deleteExpiredLogs,
	startLogRetention,
};
