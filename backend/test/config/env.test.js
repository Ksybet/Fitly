jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('environment configuration', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
		jest.resetModules();
	});

	test('normalizes a valid port and uses the network-safe host default', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.PORT = '4567';
		delete process.env.HOST;
		jest.resetModules();

		const env = require('../../src/config/env');
		expect(env.PORT).toBe(4567);
		expect(env.HOST).toBe('0.0.0.0');
		expect(env.TRUST_PROXY_HOPS).toBe(1);
		expect(env.SYSTEM_LOG_RETENTION_DAYS).toBe(90);
	});

	test('rejects a missing JWT secret and invalid port', () => {
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.JWT_SECRET = ' ';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow('JWT_SECRET environment variable is required');

		process.env.JWT_SECRET = 'secret';
		process.env.PORT = 'invalid';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow('PORT must be an integer between 1 and 65535');
	});

	test('rejects a missing database URL', () => {
		process.env.JWT_SECRET = 'secret';
		delete process.env.DATABASE_URL;
		jest.resetModules();

		expect(() => require('../../src/config/env')).toThrow(
			'DATABASE_URL environment variable is required',
		);
	});

	test('exposes optional administrator bootstrap settings', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.ADMIN_EMAIL = 'admin@example.com';
		process.env.ADMIN_PASSWORD = 'Strong!Admin123';
		jest.resetModules();

		const env = require('../../src/config/env');
		expect(env.ADMIN_EMAIL).toBe('admin@example.com');
		expect(env.ADMIN_PASSWORD).toBe('Strong!Admin123');
	});

	test('validates trusted proxy hops', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.TRUST_PROXY_HOPS = '0';
		jest.resetModules();
		expect(require('../../src/config/env').TRUST_PROXY_HOPS).toBe(0);

		process.env.TRUST_PROXY_HOPS = 'invalid';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow(
			'TRUST_PROXY_HOPS must be an integer between 0 and 10',
		);
	});

	test('validates notification worker limits', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.NOTIFICATION_WORKER_BATCH_SIZE = '50';
		process.env.NOTIFICATION_WORKER_POLL_MS = '1000';
		jest.resetModules();
		const env = require('../../src/config/env');
		expect(env.NOTIFICATION_WORKER_BATCH_SIZE).toBe(50);
		expect(env.NOTIFICATION_WORKER_POLL_MS).toBe(1000);

		process.env.NOTIFICATION_WORKER_BATCH_SIZE = '101';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow(
			'NOTIFICATION_WORKER_BATCH_SIZE must be an integer between 1 and 100',
		);
	});

	test('validates system log retention days', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.SYSTEM_LOG_RETENTION_DAYS = '30';
		jest.resetModules();
		expect(require('../../src/config/env').SYSTEM_LOG_RETENTION_DAYS).toBe(30);

		process.env.SYSTEM_LOG_RETENTION_DAYS = '0';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow(
			'SYSTEM_LOG_RETENTION_DAYS must be an integer between 1 and 3650',
		);
	});

	test('builds Postbox configuration with safe defaults on demand', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.POSTBOX_ACCESS_KEY_ID = 'static-key-id';
		process.env.POSTBOX_SECRET_ACCESS_KEY = 'static-secret';
		process.env.POSTBOX_FROM_EMAIL = 'noreply@fitlyapp.ru';
		delete process.env.POSTBOX_REGION;
		delete process.env.POSTBOX_ENDPOINT;
		jest.resetModules();

		expect(require('../../src/config/env').getPostboxConfig()).toEqual({
			accessKeyId: 'static-key-id',
			secretAccessKey: 'static-secret',
			region: 'ru-central1',
			endpoint: 'https://postbox.cloud.yandex.net',
			fromEmail: 'noreply@fitlyapp.ru',
		});
	});

	test('does not require Postbox credentials until its configuration is requested', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		delete process.env.POSTBOX_ACCESS_KEY_ID;
		delete process.env.POSTBOX_SECRET_ACCESS_KEY;
		delete process.env.POSTBOX_FROM_EMAIL;
		jest.resetModules();

		const env = require('../../src/config/env');
		expect(() => env.getPostboxConfig()).toThrow(
			'POSTBOX_ACCESS_KEY_ID, POSTBOX_SECRET_ACCESS_KEY, POSTBOX_FROM_EMAIL environment variables are required',
		);
	});

	test.each([
		['POSTBOX_ENDPOINT', 'http://postbox.example.com', 'POSTBOX_ENDPOINT must be a valid HTTPS URL'],
		['POSTBOX_ENDPOINT', 'not-a-url', 'POSTBOX_ENDPOINT must be a valid HTTPS URL'],
		['POSTBOX_FROM_EMAIL', 'invalid-email', 'POSTBOX_FROM_EMAIL must be a valid email address'],
	])('rejects invalid %s configuration', (name, value, message) => {
		process.env.JWT_SECRET = 'secret';
		process.env.DATABASE_URL = 'postgresql://localhost/fitly';
		process.env.POSTBOX_ACCESS_KEY_ID = 'static-key-id';
		process.env.POSTBOX_SECRET_ACCESS_KEY = 'static-secret';
		process.env.POSTBOX_FROM_EMAIL = 'noreply@fitlyapp.ru';
		process.env[name] = value;
		jest.resetModules();

		expect(() => require('../../src/config/env').getPostboxConfig())
			.toThrow(message);
	});
});
