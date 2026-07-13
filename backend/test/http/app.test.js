jest.mock('../../src/config/db', () => ({
	pool: {},
}));

const express = require('express');
const request = require('supertest');
const app = require('../../src/app');
const { errorMiddleware } = require('../../src/middlewares/error.middleware');

describe('HTTP application contracts', () => {
	test('GET /health returns 200 without a database connection', async () => {
		await request(app).get('/health').expect(200, { success: true, data: 'OK' });
	});

	test('an unknown route returns a predictable JSON 404', async () => {
		await request(app).get('/missing').expect(404, {
			success: false,
			message: 'Route not found',
		});
	});

	test('request validation returns 400 instead of 500', async () => {
		await request(app).post('/api/v1/auth/login').send({}).expect(400, {
			success: false,
			message: 'Поля login, password и appVersion обязательны',
		});
	});

	test('a protected route without a JWT returns 401', async () => {
		await request(app).get('/api/v1/profile').expect(401, {
			success: false,
			message: 'Unauthorized',
		});
	});

	test('an unexpected exception is safely handled as a 500', async () => {
		const errorApp = express();
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		errorApp.get('/boom', () => {
			throw new Error('SELECT password_hash FROM Users');
		});
		errorApp.use(errorMiddleware);

		await request(errorApp).get('/boom').expect(500, {
			success: false,
			message: 'Internal server error',
		});
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});
});
