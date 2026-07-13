require('dotenv').config();

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL =
	process.env.TEST_DATABASE_URL ||
	'postgresql://fitly:fitly@localhost:55432/fitly_test';
