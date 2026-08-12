const {
	EmailIntegrationError,
	PostboxEmailAdapter,
	createPostboxEmailAdapter,
	normalizeProviderError,
} = require('../../src/integrations/email/postbox-email.adapter');

function createAdapter(options = {}) {
	const client = options.client || { send: jest.fn() };
	const logger = options.logger || {
		info: jest.fn().mockResolvedValue(null),
		error: jest.fn().mockResolvedValue(null),
	};
	return {
		adapter: new PostboxEmailAdapter({
			client,
			fromEmail: 'noreply@fitlyapp.ru',
			logger,
		}),
		client,
		logger,
	};
}

describe('Postbox email adapter', () => {
	test('sends text and HTML content and returns only the normalized acceptance', async () => {
		const { adapter, client, logger } = createAdapter();
		client.send.mockResolvedValueOnce({ MessageId: 'message-123' });

		await expect(adapter.sendEmail({
			to: ' user@example.com ',
			subject: ' Test subject ',
			text: 'Plain body',
			html: '<p>HTML body</p>',
		})).resolves.toEqual({
			provider: 'yandex-postbox',
			accepted: true,
			messageId: 'message-123',
		});

		expect(client.send).toHaveBeenCalledTimes(1);
		expect(client.send.mock.calls[0][0].input).toEqual({
			FromEmailAddress: 'noreply@fitlyapp.ru',
			Destination: { ToAddresses: ['user@example.com'] },
			Content: {
				Simple: {
					Subject: { Data: 'Test subject', Charset: 'UTF-8' },
					Body: {
						Text: { Data: 'Plain body', Charset: 'UTF-8' },
						Html: { Data: '<p>HTML body</p>', Charset: 'UTF-8' },
					},
				},
			},
		});
		expect(logger.info).toHaveBeenCalledWith('Email accepted by provider', {
			service: 'integration.email',
			provider: 'yandex-postbox',
			operation: 'send_email',
			status: 200,
			messageId: 'message-123',
		});
	});

	test('creates a real SDK client with automatic retries disabled', async () => {
		const adapter = createPostboxEmailAdapter({
			config: {
				accessKeyId: 'static-key-id',
				secretAccessKey: 'static-secret',
				region: 'ru-central1',
				endpoint: 'https://postbox.cloud.yandex.net',
				fromEmail: 'noreply@fitlyapp.ru',
			},
			logger: { info: jest.fn(), error: jest.fn() },
		});

		await expect(adapter.client.config.maxAttempts()).resolves.toBe(1);
	});

	test.each([
		[{ text: 'Plain body' }, ['Text']],
		[{ html: '<p>HTML body</p>' }, ['Html']],
	])('supports a single body representation', async (content, expectedKeys) => {
		const { adapter, client } = createAdapter();
		client.send.mockResolvedValueOnce({ MessageId: 'message-123' });

		await adapter.sendEmail({
			to: 'user@example.com',
			subject: 'Subject',
			...content,
		});

		expect(Object.keys(
			client.send.mock.calls[0][0].input.Content.Simple.Body,
		)).toEqual(expectedKeys);
	});

	test.each([
		[null, 'Email message is required'],
		[{ to: 'invalid', subject: 'Subject', text: 'Body' }, 'to must be a valid email address'],
		[{ to: 'user@example.com', subject: ' ', text: 'Body' }, 'subject must be a non-empty string'],
		[{ to: 'user@example.com', subject: 'Subject' }, 'text or html content is required'],
		[{ to: 'user@example.com', subject: 'Subject', text: 42 }, 'text must be a string'],
	])('rejects invalid internal input before calling Postbox', async (message, error) => {
		const { adapter, client } = createAdapter();

		await expect(adapter.sendEmail(message)).rejects.toThrow(error);
		expect(client.send).not.toHaveBeenCalled();
	});

	test('rejects a provider response without MessageId', async () => {
		const { adapter, client, logger } = createAdapter();
		client.send.mockResolvedValueOnce({});

		await expect(adapter.sendEmail({
			to: 'user@example.com',
			subject: 'Subject',
			text: 'Body',
		})).rejects.toMatchObject({
			name: 'EmailIntegrationError',
			provider: 'yandex-postbox',
			code: 'EMAIL_PROVIDER_INVALID_RESPONSE',
			retryable: true,
		});
		expect(logger.error).toHaveBeenCalledWith('Email provider request failed', {
			service: 'integration.email',
			provider: 'yandex-postbox',
			operation: 'send_email',
			code: 'EMAIL_PROVIDER_INVALID_RESPONSE',
			retryable: true,
			status: undefined,
		});
	});

	test.each([
		['MailFromDomainNotVerifiedException', undefined, 'EMAIL_SENDER_NOT_VERIFIED', false],
		['BadRequestException', 'sender is not allowed', 'EMAIL_SENDER_NOT_ALLOWED', false],
		['MessageRejected', undefined, 'EMAIL_MESSAGE_REJECTED', false],
		['TooManyRequestsException', undefined, 'EMAIL_RATE_LIMITED', true],
		['LimitExceededException', undefined, 'EMAIL_RATE_LIMITED', true],
		['SendingPausedException', undefined, 'EMAIL_SENDING_PAUSED', true],
		['AccountSuspendedException', undefined, 'EMAIL_ACCOUNT_SUSPENDED', false],
		['NotFoundException', undefined, 'EMAIL_PROVIDER_NOT_FOUND', false],
	])('normalizes %s without exposing provider details', (name, message, code, retryable) => {
		const providerError = Object.assign(
			new Error(message || 'provider-secret-detail'),
			{ name },
		);

		const error = normalizeProviderError(providerError);

		expect(error).toBeInstanceOf(EmailIntegrationError);
		expect(error).toMatchObject({
			message: 'Email provider request failed',
			provider: 'yandex-postbox',
			code,
			retryable,
			cause: providerError,
		});
		expect(JSON.stringify(error)).not.toContain('provider-secret-detail');
	});

	test.each([
		[400, 'EMAIL_PROVIDER_REJECTED', false],
		[503, 'EMAIL_PROVIDER_UNAVAILABLE', true],
	])('classifies an unknown HTTP %s response', (status, code, retryable) => {
		const error = normalizeProviderError(Object.assign(
			new Error('provider detail'),
			{ $metadata: { httpStatusCode: status } },
		));

		expect(error).toMatchObject({ status, code, retryable });
	});

	test('logs only safe metadata when the provider rejects a sensitive request', async () => {
		const accessKey = 'static-access-key-id';
		const secret = 'static-secret-access-key';
		const recipient = 'private@example.com';
		const body = 'private reset token';
		const providerError = Object.assign(
			new Error(`${accessKey} ${secret} ${recipient} ${body}`),
			{ name: 'MessageRejected', $metadata: { httpStatusCode: 400 } },
		);
		const { adapter, client, logger } = createAdapter();
		client.send.mockRejectedValueOnce(providerError);

		await expect(adapter.sendEmail({
			to: recipient,
			subject: 'Sensitive subject',
			text: body,
		})).rejects.toMatchObject({ code: 'EMAIL_MESSAGE_REJECTED' });

		const serializedLog = JSON.stringify(logger.error.mock.calls);
		for (const sensitive of [accessKey, secret, recipient, body, 'Sensitive subject']) {
			expect(serializedLog).not.toContain(sensitive);
		}
		expect(serializedLog).toContain('EMAIL_MESSAGE_REJECTED');
	});

	test('ignores logger failures and preserves the provider result', async () => {
		const logger = {
			info: jest.fn().mockRejectedValue(new Error('logger unavailable')),
			error: jest.fn().mockRejectedValue(new Error('logger unavailable')),
		};
		const { adapter, client } = createAdapter({ logger });
		client.send.mockResolvedValueOnce({ MessageId: 'message-123' });

		await expect(adapter.sendEmail({
			to: 'user@example.com',
			subject: 'Subject',
			text: 'Body',
		})).resolves.toMatchObject({ accepted: true, messageId: 'message-123' });
	});
});
