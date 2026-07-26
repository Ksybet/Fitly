jest.mock('../../src/modules/system/system.repository', () => ({
	checkDatabase: jest.fn(),
}));

const systemRepository = require('../../src/modules/system/system.repository');
const systemService = require('../../src/modules/system/system.service');

describe('system service', () => {
	beforeEach(() => jest.clearAllMocks());

	test('reports healthy API and database state with an ISO timestamp', async () => {
		systemRepository.checkDatabase.mockResolvedValueOnce();

		const result = await systemService.getHealth();

		expect(result).toEqual({
			status: 'ok',
			database: 'ok',
			timestamp: expect.any(String),
		});
		expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
	});

	test('maps a database failure to a safe service unavailable error', async () => {
		const databaseError = new Error('connection refused');
		systemRepository.checkDatabase.mockRejectedValueOnce(databaseError);

		await expect(systemService.getHealth()).rejects.toMatchObject({
			status: 503,
			code: 'SERVICE_UNAVAILABLE',
			message: 'Service temporarily unavailable',
			cause: databaseError,
		});
	});
});
