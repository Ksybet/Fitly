const env = require('./config/env');
const { connectDatabase, closeDatabase } = require('./config/db');
const { ExpoPushAdapter } = require('./modules/notifications/expo-push.adapter');
const workerService = require('./modules/notifications/notification-worker.service');
const logger = require('./modules/logging/logger');

let stopping = false;

function wait(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function run() {
	await connectDatabase();
	const adapter = new ExpoPushAdapter({ accessToken: env.EXPO_ACCESS_TOKEN });
	await workerService.restoreSchedules();
	void logger.info('Notification worker started', {
		service: 'worker.notifications',
	});

	while (!stopping) {
		try {
			await workerService.runWorkerCycle(adapter, {
				limit: env.NOTIFICATION_WORKER_BATCH_SIZE,
				leaseSeconds: env.NOTIFICATION_WORKER_LEASE_SECONDS,
			});
		} catch (error) {
			await logger.warning('Notification worker cycle failed', {
				service: 'worker.notifications',
				error,
			});
		}
		if (!stopping) {
			await wait(env.NOTIFICATION_WORKER_POLL_MS);
		}
	}
}

async function stop() {
	if (stopping) return;
	stopping = true;
	await logger.info('Notification worker is shutting down', {
		service: 'worker.notifications',
	});
	await closeDatabase();
}

process.once('SIGTERM', stop);
process.once('SIGINT', stop);

run().catch(async error => {
	await logger.critical('Failed to start notification worker', {
		service: 'worker.notifications',
		error,
	});
	await stop();
	process.exitCode = 1;
});
