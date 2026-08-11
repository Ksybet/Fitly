const app = require('./app');
const env = require('./config/env');
const { connectDatabase, closeDatabase } = require('./config/db');
const {
	bootstrapAdministrator,
} = require('./modules/admin/admin-bootstrap.service');
const logger = require('./modules/logging/logger');
const {
	startLogRetention,
} = require('./modules/logging/log-retention.service');

async function startServer() {
	await connectDatabase();
	await bootstrapAdministrator({
		email: env.ADMIN_EMAIL,
		password: env.ADMIN_PASSWORD,
	});
	const stopLogRetention = startLogRetention();

	const server = app.listen(env.PORT, env.HOST, () => {
		void logger.info('Fitly API is listening', {
			service: 'api.lifecycle',
			host: env.HOST,
			port: env.PORT,
		});
	});

	async function shutdown(signal) {
		stopLogRetention();
		await logger.info('Fitly API is shutting down', {
			service: 'api.lifecycle',
			signal,
		});
		server.close(async () => {
			await closeDatabase();
		});
	}

	process.once('SIGINT', () => shutdown('SIGINT'));
	process.once('SIGTERM', () => shutdown('SIGTERM'));

	return server;
}

if (require.main === module) {
	startServer().catch(async error => {
		await logger.critical('Failed to start Fitly API', {
			service: 'api.lifecycle',
			error,
		});
		await closeDatabase().catch(() => {});
		process.exitCode = 1;
	});
}

module.exports = { startServer };
