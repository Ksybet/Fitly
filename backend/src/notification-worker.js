const env = require('./config/env');
const { connectDatabase, closeDatabase } = require('./config/db');
const { ExpoPushAdapter } = require('./modules/notifications/expo-push.adapter');
const workerService = require('./modules/notifications/notification-worker.service');

let stopping = false;

function wait(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function run() {
	await connectDatabase();
	const adapter = new ExpoPushAdapter({ accessToken: env.EXPO_ACCESS_TOKEN });
	await workerService.restoreSchedules();

	while (!stopping) {
		try {
			await workerService.runWorkerCycle(adapter, {
				limit: env.NOTIFICATION_WORKER_BATCH_SIZE,
				leaseSeconds: env.NOTIFICATION_WORKER_LEASE_SECONDS,
			});
		} catch (error) {
			console.error('Notification worker cycle failed:', error.message);
		}
		if (!stopping) {
			await wait(env.NOTIFICATION_WORKER_POLL_MS);
		}
	}
}

async function stop() {
	if (stopping) return;
	stopping = true;
	await closeDatabase();
}

process.once('SIGTERM', stop);
process.once('SIGINT', stop);

run().catch(async error => {
	console.error('Failed to start notification worker:', error.message);
	await stop();
	process.exitCode = 1;
});
