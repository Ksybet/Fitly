module.exports = {
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/test/setup-env.js'],
	testPathIgnorePatterns: ['/node_modules/', '/test/integration/'],
	collectCoverageFrom: [
		'src/modules/**/*.service.js',
		'src/modules/auth/auth.middleware.js',
		'src/middlewares/**/*.js',
		'src/config/env.js',
		'src/utils/**/*.js',
		'src/server.js',
	],
	coverageThreshold: {
		global: {
			statements: 85,
			branches: 80,
			functions: 80,
			lines: 85,
		},
	},
};
