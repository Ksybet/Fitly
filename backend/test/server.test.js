const mockListen = jest.fn();
const mockConnectDatabase = jest.fn();
const mockCloseDatabase = jest.fn();
const mockBootstrapAdministrator = jest.fn();
const mockStartLogRetention = jest.fn();
const mockStopLogRetention = jest.fn();

jest.mock('../src/app', () => ({
	listen: mockListen,
}));

jest.mock('../src/config/db', () => ({
	connectDatabase: mockConnectDatabase,
	closeDatabase: mockCloseDatabase,
}));

jest.mock('../src/modules/admin/admin-bootstrap.service', () => ({
	bootstrapAdministrator: mockBootstrapAdministrator,
}));
jest.mock('../src/modules/logging/log-retention.service', () => ({
	startLogRetention: mockStartLogRetention,
}));

const env = require('../src/config/env');
const { startServer } = require('../src/server');
const logger = require('../src/modules/logging/logger');

describe('server lifecycle', () => {
	let server;
	let signalHandlers;

	beforeEach(() => {
		jest.clearAllMocks();
		signalHandlers = {};
		server = {
			close: jest.fn(callback => callback()),
		};

		mockConnectDatabase.mockResolvedValue(undefined);
		mockCloseDatabase.mockResolvedValue(undefined);
		mockBootstrapAdministrator.mockResolvedValue({ status: 'disabled' });
		mockStartLogRetention.mockReturnValue(mockStopLogRetention);
		mockListen.mockReturnValue(server);

		jest.spyOn(process, 'once').mockImplementation((signal, handler) => {
			signalHandlers[signal] = handler;
			return process;
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('connects to the database before listening and reports readiness', async () => {
		const serverResult = await startServer();

		expect(serverResult).toBe(server);
		expect(mockConnectDatabase).toHaveBeenCalledTimes(1);
		expect(mockBootstrapAdministrator).toHaveBeenCalledWith({
			email: env.ADMIN_EMAIL,
			password: env.ADMIN_PASSWORD,
		});
		expect(mockListen).toHaveBeenCalledWith(env.PORT, env.HOST, expect.any(Function));
		expect(mockConnectDatabase.mock.invocationCallOrder[0])
			.toBeLessThan(mockBootstrapAdministrator.mock.invocationCallOrder[0]);
		expect(mockBootstrapAdministrator.mock.invocationCallOrder[0])
			.toBeLessThan(mockListen.mock.invocationCallOrder[0]);
		expect(mockStartLogRetention).toHaveBeenCalledTimes(1);
		expect(process.once).toHaveBeenCalledWith('SIGINT', expect.any(Function));
		expect(process.once).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

		const readyCallback = mockListen.mock.calls[0][2];
		readyCallback();
		expect(logger.info).toHaveBeenCalledWith('Fitly API is listening', {
			service: 'api.lifecycle',
			host: env.HOST,
			port: env.PORT,
		});
	});

	test('does not open a port when the database connection fails', async () => {
		const connectionError = new Error('database unavailable');
		mockConnectDatabase.mockRejectedValueOnce(connectionError);

		await expect(startServer()).rejects.toBe(connectionError);
		expect(mockBootstrapAdministrator).not.toHaveBeenCalled();
		expect(mockListen).not.toHaveBeenCalled();
		expect(process.once).not.toHaveBeenCalled();
	});

	test('does not open a port when administrator bootstrap fails', async () => {
		const bootstrapError = new Error('administrator bootstrap failed');
		mockBootstrapAdministrator.mockRejectedValueOnce(bootstrapError);

		await expect(startServer()).rejects.toBe(bootstrapError);
		expect(mockConnectDatabase).toHaveBeenCalledTimes(1);
		expect(mockListen).not.toHaveBeenCalled();
		expect(process.once).not.toHaveBeenCalled();
	});

	test.each(['SIGINT', 'SIGTERM'])('closes the server and database after %s', async signal => {
		const listenerCount = process.listenerCount(signal);
		await startServer();

		expect(process.listenerCount(signal)).toBe(listenerCount);
		await signalHandlers[signal]();

		expect(mockStopLogRetention).toHaveBeenCalledTimes(1);
		expect(logger.info).toHaveBeenCalledWith('Fitly API is shutting down', {
			service: 'api.lifecycle',
			signal,
		});
		expect(server.close).toHaveBeenCalledTimes(1);
		expect(mockCloseDatabase).toHaveBeenCalledTimes(1);
		expect(server.close.mock.invocationCallOrder[0])
			.toBeLessThan(mockCloseDatabase.mock.invocationCallOrder[0]);
	});
});
