const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const env = require('../../config/env');
const defaultLogger = require('../../modules/logging/logger');

const PROVIDER = 'yandex-postbox';
const OPERATION = 'send_email';
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailIntegrationError extends Error {
	constructor(code, retryable, options = {}) {
		super('Email provider request failed', options.cause
			? { cause: options.cause }
			: undefined);
		this.name = 'EmailIntegrationError';
		this.provider = PROVIDER;
		this.code = code;
		this.retryable = retryable;
		this.status = Number.isInteger(options.status) ? options.status : undefined;
	}
}

function providerErrorName(error) {
	return error?.name || error?.Code || error?.code;
}

function providerStatus(error) {
	const status = Number(
		error?.$metadata?.httpStatusCode
		?? error?.statusCode
		?? error?.status
		?? error?.response?.status,
	);
	return Number.isInteger(status) ? status : undefined;
}

function normalizeProviderError(error) {
	if (error instanceof EmailIntegrationError) return error;

	const name = providerErrorName(error);
	const status = providerStatus(error);
	let code = 'EMAIL_PROVIDER_UNAVAILABLE';
	let retryable = true;

	if (name === 'MailFromDomainNotVerifiedException') {
		code = 'EMAIL_SENDER_NOT_VERIFIED';
		retryable = false;
	} else if (
		name === 'BadRequestException'
		&& /sender is not allowed/i.test(String(error?.message || ''))
	) {
		code = 'EMAIL_SENDER_NOT_ALLOWED';
		retryable = false;
	} else if (name === 'MessageRejected') {
		code = 'EMAIL_MESSAGE_REJECTED';
		retryable = false;
	} else if (name === 'TooManyRequestsException' || name === 'LimitExceededException') {
		code = 'EMAIL_RATE_LIMITED';
	} else if (name === 'SendingPausedException') {
		code = 'EMAIL_SENDING_PAUSED';
	} else if (name === 'AccountSuspendedException') {
		code = 'EMAIL_ACCOUNT_SUSPENDED';
		retryable = false;
	} else if (name === 'NotFoundException' || status === 404) {
		code = 'EMAIL_PROVIDER_NOT_FOUND';
		retryable = false;
	} else if (status !== undefined && status >= 400 && status < 500) {
		code = 'EMAIL_PROVIDER_REJECTED';
		retryable = false;
	}

	return new EmailIntegrationError(code, retryable, { cause: error, status });
}

function assertEmailAddress(value, fieldName) {
	if (
		typeof value !== 'string'
		|| value.trim().length > 254
		|| !EMAIL_ADDRESS_PATTERN.test(value.trim())
	) {
		throw new TypeError(`${fieldName} must be a valid email address`);
	}
	return value.trim();
}

function assertMessage(message) {
	if (!message || typeof message !== 'object') {
		throw new TypeError('Email message is required');
	}
	const to = assertEmailAddress(message.to, 'to');
	if (typeof message.subject !== 'string' || !message.subject.trim()) {
		throw new TypeError('subject must be a non-empty string');
	}
	if (message.text !== undefined && typeof message.text !== 'string') {
		throw new TypeError('text must be a string');
	}
	if (message.html !== undefined && typeof message.html !== 'string') {
		throw new TypeError('html must be a string');
	}
	const hasText = typeof message.text === 'string' && message.text.length > 0;
	const hasHtml = typeof message.html === 'string' && message.html.length > 0;
	if (!hasText && !hasHtml) {
		throw new TypeError('text or html content is required');
	}
	return { to, hasText, hasHtml };
}

async function safeLog(logger, method, message, context) {
	try {
		await logger?.[method]?.(message, context);
	} catch {
		// Logging must never change the email provider result.
	}
}

class PostboxEmailAdapter {
	constructor({ client, fromEmail, logger = defaultLogger } = {}) {
		if (!client || typeof client.send !== 'function') {
			throw new TypeError('Postbox client with send() is required');
		}
		this.client = client;
		this.fromEmail = assertEmailAddress(fromEmail, 'fromEmail');
		this.logger = logger;
	}

	async logFailure(error) {
		await safeLog(this.logger, 'error', 'Email provider request failed', {
			service: 'integration.email',
			provider: PROVIDER,
			operation: OPERATION,
			code: error.code,
			retryable: error.retryable,
			status: error.status,
		});
	}

	async sendEmail(message) {
		const { to, hasText, hasHtml } = assertMessage(message);
		const body = {};
		if (hasText) {
			body.Text = { Data: message.text, Charset: 'UTF-8' };
		}
		if (hasHtml) {
			body.Html = { Data: message.html, Charset: 'UTF-8' };
		}

		let response;
		try {
			response = await this.client.send(new SendEmailCommand({
				FromEmailAddress: this.fromEmail,
				Destination: { ToAddresses: [to] },
				Content: {
					Simple: {
						Subject: { Data: message.subject.trim(), Charset: 'UTF-8' },
						Body: body,
					},
				},
			}));
		} catch (error) {
			const normalized = normalizeProviderError(error);
			await this.logFailure(normalized);
			throw normalized;
		}

		if (typeof response?.MessageId !== 'string' || !response.MessageId.trim()) {
			const error = new EmailIntegrationError(
				'EMAIL_PROVIDER_INVALID_RESPONSE',
				true,
			);
			await this.logFailure(error);
			throw error;
		}

		const result = {
			provider: PROVIDER,
			accepted: true,
			messageId: response.MessageId.trim(),
		};
		await safeLog(this.logger, 'info', 'Email accepted by provider', {
			service: 'integration.email',
			provider: PROVIDER,
			operation: OPERATION,
			status: providerStatus(response) || 200,
			messageId: result.messageId,
		});
		return result;
	}
}

function createPostboxEmailAdapter(options = {}) {
	const config = options.config || env.getPostboxConfig();
	const client = options.client || new SESv2Client({
		region: config.region,
		endpoint: config.endpoint,
		maxAttempts: 1,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
	return new PostboxEmailAdapter({
		client,
		fromEmail: config.fromEmail,
		logger: options.logger,
	});
}

module.exports = {
	EmailIntegrationError,
	PostboxEmailAdapter,
	createPostboxEmailAdapter,
	normalizeProviderError,
};
