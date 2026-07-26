module.exports = {
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/test/setup-env.js'],
	testMatch: ['<rootDir>/test/integration/**/*.test.js'],
	testTimeout: 30000,
};
