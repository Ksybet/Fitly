module.exports = {
	testEnvironment: 'node',
	setupFiles: ['<rootDir>/test/setup-env.js'],
	collectCoverageFrom: [
		'src/modules/**/*.service.js',
		'src/middlewares/**/*.js',
		'src/config/env.js',
		'src/utils/**/*.js',
	],
};
