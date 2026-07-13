describe('environment configuration', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
		jest.resetModules();
	});

	test('normalizes a valid port and uses the network-safe host default', () => {
		process.env.JWT_SECRET = 'secret';
		process.env.PORT = '4567';
		delete process.env.HOST;
		jest.resetModules();

		const env = require('../../src/config/env');
		expect(env.PORT).toBe(4567);
		expect(env.HOST).toBe('0.0.0.0');
	});

	test('rejects a missing JWT secret and invalid port', () => {
		process.env.JWT_SECRET = ' ';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow('JWT_SECRET environment variable is required');

		process.env.JWT_SECRET = 'secret';
		process.env.PORT = 'invalid';
		jest.resetModules();
		expect(() => require('../../src/config/env')).toThrow('PORT must be an integer between 1 and 65535');
	});
});
