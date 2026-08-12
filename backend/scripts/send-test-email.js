const {
	EmailIntegrationError,
	createPostboxEmailAdapter,
} = require('../src/integrations/email/postbox-email.adapter');

const silentLogger = {
	info: async () => null,
	error: async () => null,
};

async function main(args = process.argv.slice(2)) {
	if (args.length !== 1) {
		console.error(JSON.stringify({
			success: false,
			code: 'EMAIL_SMOKE_RECIPIENT_REQUIRED',
			usage: 'npm run email:smoke -- recipient@example.com',
		}));
		process.exitCode = 1;
		return;
	}

	try {
		const adapter = createPostboxEmailAdapter({ logger: silentLogger });
		const result = await adapter.sendEmail({
			to: args[0],
			subject: 'Fitly Postbox integration check',
			text: 'Yandex Cloud Postbox accepted a test email from Fitly.',
			html: '<p>Yandex Cloud Postbox accepted a test email from <strong>Fitly</strong>.</p>',
		});
		console.log(JSON.stringify(result));
	} catch (error) {
		console.error(JSON.stringify({
			success: false,
			provider: error instanceof EmailIntegrationError
				? error.provider
				: undefined,
			code: error instanceof EmailIntegrationError
				? error.code
				: 'EMAIL_SMOKE_FAILED',
			retryable: error instanceof EmailIntegrationError
				? error.retryable
				: false,
		}));
		process.exitCode = 1;
	}
}

if (require.main === module) {
	void main();
}

module.exports = { main };
