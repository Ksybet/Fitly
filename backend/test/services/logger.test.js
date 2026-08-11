jest.unmock('../../src/modules/logging/logger');
jest.mock('../../src/modules/logging/log.repository', () => ({
	createLog: jest.fn(),
	deleteLogsBefore: jest.fn(),
}));

const logRepository = require('../../src/modules/logging/log.repository');
const logger = require('../../src/modules/logging/logger');

describe('structured system logger', () => {
	let consoleLog;
	let consoleWarn;
	let consoleError;

	beforeEach(() => {
		jest.clearAllMocks();
		logRepository.createLog.mockResolvedValue(1);
		consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
		consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test.each([
		['info', 'info', 'log'],
		['warning', 'warning', 'warn'],
		['error', 'error', 'error'],
		['critical', 'critical', 'error'],
	])('persists and emits %s entries', async (method, level, consoleMethod) => {
		const entry = await logger[method]('Application event', {
			service: 'api.test',
			userId: 7,
			requestId: 'req_test',
		});

		expect(entry).toMatchObject({
			level,
			service: 'api.test',
			userId: 7,
			requestId: 'req_test',
			message: 'Application event',
			metadata: {},
		});
		expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
		expect(logRepository.createLog).toHaveBeenCalledWith(entry);
		expect({ log: consoleLog, warn: consoleWarn, error: consoleError }[consoleMethod])
			.toHaveBeenCalled();
	});

	test('extracts error stack and recursively redacts secrets', async () => {
		const error = new Error('Bearer secret-access-token');
		const entry = await logger.error('Database postgresql://fitly:password@db/fitly', {
			service: 'database',
			error,
			password: 'plain-text',
			metadata: {
				authorization: 'Bearer another-token',
				nested: { refreshToken: 'refresh-secret' },
				connection: 'postgresql://user:secret@host/database',
			},
		});

		expect(entry.message).toContain('[REDACTED]');
		expect(entry.stackTrace).toContain('Bearer [REDACTED]');
		expect(entry.metadata).toEqual({
			authorization: '[REDACTED]',
			nested: { refreshToken: '[REDACTED]' },
			connection: 'postgresql://user:[REDACTED]@host/database',
			password: '[REDACTED]',
		});
	});

	test('does not reject when PostgreSQL persistence fails', async () => {
		logRepository.createLog.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(logger.error('Request failed', {
			service: 'api.test',
		})).resolves.toMatchObject({ message: 'Request failed' });

		expect(consoleError).toHaveBeenCalledTimes(2);
		expect(consoleError.mock.calls[1][0]).toContain('Failed to persist system log');
	});
});
