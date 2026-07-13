module.exports = {
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/test/setup-env.js'],
	testPathIgnorePatterns: ['/node_modules/', '/test/integration/'],
	collectCoverageFrom: [
		'src/modules/**/*.service.js',
		'src/middlewares/**/*.js',
		'src/config/env.js',
		'src/utils/**/*.js',
	],
};
