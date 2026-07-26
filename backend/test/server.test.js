const mockListen = jest.fn();
const mockConnectDatabase = jest.fn();
const mockCloseDatabase = jest.fn();

jest.mock('../src/app', () => ({
	listen: mockListen,
}));

jest.mock('../src/config/db', () => ({
	connectDatabase: mockConnectDatabase,
	closeDatabase: mockCloseDatabase,
}));

const env = require('../src/config/env');
const { startServer } = require('../src/server');

describe('server lifecycle', () => {
	let server;
	let signalHandlers;
	let consoleLog;

	beforeEach(() => {
		jest.clearAllMocks();
		signalHandlers = {};
		server = {
			close: jest.fn(callback => callback()),
		};

		mockConnectDatabase.mockResolvedValue(undefined);
		mockCloseDatabase.mockResolvedValue(undefined);
		mockListen.mockReturnValue(server);

		jest.spyOn(process, 'once').mockImplementation((signal, handler) => {
			signalHandlers[signal] = handler;
			return process;
		});
		consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('connects to the database before listening and reports readiness', async () => {
		const serverResult = await startServer();

		expect(serverResult).toBe(server);
		expect(mockConnectDatabase).toHaveBeenCalledTimes(1);
		expect(mockListen).toHaveBeenCalledWith(env.PORT, env.HOST, expect.any(Function));
		expect(mockConnectDatabase.mock.invocationCallOrder[0])
			.toBeLessThan(mockListen.mock.invocationCallOrder[0]);
		expect(process.once).toHaveBeenCalledWith('SIGINT', expect.any(Function));
		expect(process.once).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

		const readyCallback = mockListen.mock.calls[0][2];
		readyCallback();
		expect(consoleLog).toHaveBeenCalledWith(
			`Fitly API is listening on ${env.HOST}:${env.PORT}`,
		);
	});

	test('does not open a port when the database connection fails', async () => {
		const connectionError = new Error('database unavailable');
		mockConnectDatabase.mockRejectedValueOnce(connectionError);

		await expect(startServer()).rejects.toBe(connectionError);
		expect(mockListen).not.toHaveBeenCalled();
		expect(process.once).not.toHaveBeenCalled();
	});

	test.each(['SIGINT', 'SIGTERM'])('closes the server and database after %s', async signal => {
		const listenerCount = process.listenerCount(signal);
		await startServer();

		expect(process.listenerCount(signal)).toBe(listenerCount);
		signalHandlers[signal]();

		expect(consoleLog).toHaveBeenCalledWith(`${signal} received, shutting down`);
		expect(server.close).toHaveBeenCalledTimes(1);
		expect(mockCloseDatabase).toHaveBeenCalledTimes(1);
		expect(server.close.mock.invocationCallOrder[0])
			.toBeLessThan(mockCloseDatabase.mock.invocationCallOrder[0]);
	});
});
