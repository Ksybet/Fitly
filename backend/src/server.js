const app = require('./app');
const env = require('./config/env');
const { connectDatabase, closeDatabase } = require('./config/db');
const {
	bootstrapAdministrator,
} = require('./modules/admin/admin-bootstrap.service');

async function startServer() {
	await connectDatabase();
	await bootstrapAdministrator({
		email: env.ADMIN_EMAIL,
		password: env.ADMIN_PASSWORD,
	});

	const server = app.listen(env.PORT, env.HOST, () => {
		console.log(`Fitly API is listening on ${env.HOST}:${env.PORT}`);
	});

	async function shutdown(signal) {
		console.log(`${signal} received, shutting down`);
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
		console.error('Failed to start Fitly API:', error);
		await closeDatabase().catch(() => {});
		process.exitCode = 1;
	});
}

module.exports = { startServer };
