jest.mock('../../src/modules/logging/log.repository', () => ({
	createLog: jest.fn(),
	deleteLogsBefore: jest.fn(),
}));
jest.mock('../../src/modules/logging/logger', () => ({
	warning: jest.fn(),
}));

const logRepository = require('../../src/modules/logging/log.repository');
const logger = require('../../src/modules/logging/logger');
const {
	retentionCutoff,
	deleteExpiredLogs,
	startLogRetention,
} = require('../../src/modules/logging/log-retention.service');

describe('system log retention', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		logRepository.deleteLogsBefore.mockResolvedValue(2);
		logger.warning.mockResolvedValue(undefined);
	});

	test('calculates and deletes logs strictly before the retention boundary', async () => {
		const now = new Date('2026-08-12T12:00:00.000Z');
		const cutoff = retentionCutoff(90, now);

		expect(cutoff.toISOString()).toBe('2026-05-14T12:00:00.000Z');
		await expect(deleteExpiredLogs(90, now)).resolves.toBe(2);
		expect(logRepository.deleteLogsBefore).toHaveBeenCalledWith(cutoff);
	});

	test('runs immediately, reports a cleanup failure, and can be stopped', async () => {
		jest.useFakeTimers();
		logRepository.deleteLogsBefore.mockRejectedValueOnce(new Error('offline'));
		const stop = startLogRetention({ retentionDays: 90, intervalMs: 1000 });

		await jest.advanceTimersByTimeAsync(0);
		expect(logger.warning).toHaveBeenCalledWith(
			'System log retention cleanup failed',
			expect.objectContaining({
				service: 'api.logging',
				retentionDays: 90,
			}),
		);

		stop();
		jest.advanceTimersByTime(1000);
		expect(logRepository.deleteLogsBefore).toHaveBeenCalledTimes(1);
		jest.useRealTimers();
	});
});
